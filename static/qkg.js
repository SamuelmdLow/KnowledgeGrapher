var old = "";
var things = [];
var markup = "";

function onload()
{
    var saved = document.getElementById("saved").value;
    markup = saved;
    console.log("type 'markup' to get the markup for this graph");
    things = processInput(saved);
    setup(things);
    window.requestAnimationFrame(staticUpdate);
    document.getElementById("graph").setAttribute("ondblclick", "deselect()");
    document.getElementById("saved").remove();
    testRel();

    MathJax.typesetPromise()
}

function staticUpdate(timeStamp)
{
    panning();
    placein();

    window.requestAnimationFrame(staticUpdate);
}

function deselect() {
    for(let i=0; i<selected.length; i++) {
        document.getElementById(selected[i]).classList.remove("inspected");
    }
    selected = [];
}

function cleanText(plainText) {
    return DOMPurify.sanitize(plainText, {USE_PROFILES: {html: true}});
}

function prepareText(plainText)
{
    let clean = DOMPurify.sanitize(plainText, {USE_PROFILES: {html: true}});
    return marked.parse(clean);
}

function showInspector(that)
{
    var thing = getThingsFromId(that.id);

    var graph = document.getElementById("graph");
    if(graph.getAttribute("inspected")!="none")
    {
        uninspect(document.getElementById(graph.getAttribute("inspected")));
    }
    that.classList.toggle("inspected");
    graph.setAttribute("inspected", that.id);
    var inspector = document.getElementById("inspector");
    inspector.style.display = "block";
    document.getElementById("inspector-name").innerHTML = cleanText(thing.name);
    document.getElementById("inspector-id").innerHTML = that.id;
    if (thing.image != "null") {
        document.getElementById("inspector-image").style.display = "block";
        document.getElementById("inspector-image").src = thing.image;
    } else {
        document.getElementById("inspector-image").style.display = "none";
    }
    document.getElementById("inspector-desc").innerHTML = prepareText(thing.desc);


    var rels = document.getElementById("inspector-rels");
    rels.innerHTML = '';

    for(let i=0; i<thing.sendTo.length; i++)
    {
        var receiver = thing.sendTo[i].node;
        var li = document.createElement("li");
        li.innerHTML = "<p>"+ thing.name + " <strong>" + thing.sendTo[i].rel + "</strong> " + receiver.name + "</p>";
        rels.appendChild(li);
    }
    setTimeout(MathJax.typesetPromise(), 1);
}

var selected = []

function selectThis(that)
{
    var thing = getThingsFromId(that.id);
    var graph = document.getElementById("graph");

    if(selected.includes(thing.id)) {
        selected.splice(selected.indexOf(thing.id), 1);
    } else {
        selected.push(thing.id);
    }
    that.classList.toggle("inspected");
}

function setup(things)
{
    var graph = document.getElementById("graph");
    graph.addEventListener("contextmenu", (e) => {e.preventDefault()});
    var scale = parseFloat(graph.getAttribute("scale"));
    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        const circle = document.createElement("DIV");
        circle.classList.add("circle");
        circle.id = thing.id;
        circle.setAttribute("onclick", "selectThis(this)");
        circle.style.backgroundImage = "url('"+thing.image+"')";

        circle.addEventListener("wheel", function(e) {
            initializeZooming(e);
        },{passive:false});

        const name = document.createElement("p");
        name.innerHTML = thing.name;
        name.classList.add("name");

        if(thing.image!="null")
        {
            name.classList.add("imageText");
        }

        name.style.fontSize = String(Math.ceil(scale*thing.mass/4)) + "px";

        circle.appendChild(name);

        var friends = [];
        var attracts = [];
        for(let x=0;x<thing.sendTo.length; x++)
        {
            var themId = thing.sendTo[x].node.id;
            attracts.push(themId);

            if(friends.includes(themId) == false)
            {
                friends.push(themId);
                var line = document.createElement("DIV");
                line.classList.add("line");
                line.setAttribute("target", themId);
                line.setAttribute("count", 1);

                circle.appendChild(line);
            }
            else
            {
                for(let n=0;n<circle.children.length;n++)
                {
                    if(circle.children[n].getAttribute("target")==themId)
                    {
                        var thick = parseInt(circle.children[n].getAttribute("count"))+1;
                        circle.children[n].setAttribute("count",thick);
                        break;
                    }
                }
            }

        }
        var circles = document.getElementById("circles");
        circles.appendChild(circle);
    }

    for(let a=0; a<things.length; a++)
    {
        var thingA = things[a];
        thingA.mass = 1;
        for(let b=0; b<things.length; b++)
        {
            if (a != b)
            {
                var thingB = things[b];
                for(let i=0; i<thingB.sendTo.length; i++)
                {
                    if(thingB.sendTo[i].node==thingA)
                    {
                        thingA.mass = thingA.mass + 0.5;
                    }
                }
            }
        }
        if($(document.getElementById(thingA.id)).is(':hover')) {
            console.log("hovering");
            document.getElementById(thingA.id).style.width = "500px";
            document.getElementById(thingA.id).style.height = "500px";
        } else {
            console.log("not");
            document.getElementById(thingA.id).style.width = String(2*scale*parseFloat(thingA.mass))+"px";
            document.getElementById(thingA.id).style.height = String(2*scale*parseFloat(thingA.mass))+"px";
        }
    }
}

function panning()
{
    if(graph.getAttribute("anchor")=="1")
    {
        var panx = parseFloat(graph.getAttribute("panx"));
        var pany = parseFloat(graph.getAttribute("pany"));

        var body = document.getElementsByTagName("BODY")[0];
        panx = panx + (parseInt(body.getAttribute("x")) - parseInt(graph.getAttribute("anchorx")));
        pany = pany + (parseInt(body.getAttribute("y")) - parseInt(graph.getAttribute("anchory")));

        graph.setAttribute("anchorx", body.getAttribute("x"));
        graph.setAttribute("anchory", body.getAttribute("y"));

        graph.setAttribute("panx", panx);
        graph.setAttribute("pany", pany);

        graph.style.backgroundPositionX = String(panx) + "px";
        graph.style.backgroundPositionY = String(pany) + "px";
    }
}

function Thing(id, name, image, desc, sendTo, receiveFrom, mass, x, y)
{
    this.id = id;
    this.name = name;
    this.image = image;
    this.desc = desc;
    this.sendTo = sendTo;
    this.receiveFrom = receiveFrom;
    this.mass = mass;
    this.x = x;
    this.y = y;
    this.velx = 0;
    this.vely = 0;
}

function Relation(rel, node)
{
    this.rel = rel;
    this.node = node;
}

function processInput(input)
{
    var things = []
    input = input + "\n";
    input = input.split("}\n");
    input.pop();

    for (let i=0; i<input.length; i++)
    {
        var thing = input[i];

        if (thing.includes("{"))
            {
            var id = thing.slice(0, thing.indexOf("{")).trim();
            if (id.length>0)
            {
                thing = thing.replace(id, "");
                thing = thing.replace("{", "");
                if(thing.includes("name:"))
                {
                    var name = thing.slice(thing.indexOf("name:")+5);
                    name = name.slice(0, name.indexOf("\n")).trim();


                    thing = thing.replace("name:", "");
                    thing = thing.replace(name, "");

                }
                else
                {
                    var name = null;
                }

                if(thing.includes("image:"))
                {
                    var image = thing.slice(thing.indexOf("image:")+6);
                    image = image.slice(0, image.indexOf("\n")).trim();

                    thing = thing.replace("image:", "");
                    thing = thing.replace(image, "");
                }
                else
                {
                    var image = null;
                }

                if(thing.includes("x:"))
                {
                    var xstr = thing.slice(thing.indexOf("x:"));
                    var xstr = xstr.slice(0, xstr.indexOf("\n"));
                    thing = thing.replace(xstr, "");
                    if (xstr=="NaN") {
                        var x = null
                    } else {
                        var x = parseFloat(xstr.slice(2).trim());
                    }
                }
                else
                {
                    var x = null;
                }

                if(thing.includes("y:"))
                {
                    var ystr = thing.slice(thing.indexOf("y:"));
                    var ystr = ystr.slice(0, ystr.indexOf("\n"));
                    thing = thing.replace(ystr, "");
                    if (ystr=="NaN") {
                        y = null
                    } else {
                        var y = parseFloat(ystr.slice(2).trim());
                    }
                }
                else
                {
                    var y = null;
                }

                if(thing.includes("desc:"))
                {
                    var desc = thing.slice(thing.indexOf("desc:")+5);
                    var descSep = "\n---\n";
                    if(desc.includes(descSep)){
                        desc = desc.slice(0, desc.indexOf(descSep)).trim();
                    } else {
                        desc = desc.slice(0, desc.indexOf("\n")).trim();
                    }

                    thing = thing.replace("desc:", "");
                    thing = thing.replace(desc+descSep, "");
                }
                else
                {
                    var desc = null;
                }

                while(thing.includes("\n\n"))
                {
                    thing = thing.replace("\n\n", "\n");
                }

                var rawrelations = thing.split("\n");

                var relations = [];

                for(let n = 0; n<rawrelations.length; n++)
                {
                    if (rawrelations[n].includes("->") && rawrelations[n].length > 1)
                    {
                        var rel = rawrelations[n].split("->");
                        relations.push(new Relation(rel[0].trim(), rel[1].trim()));
                    }
                }

                oldThing = getThingsFromId(id);
                if(oldThing != null) {
                    x = oldThing.x;
                    y = oldThing.y;
                }

                things.push(new Thing(id, name, image, desc, relations,[], 1, x, y));
            }
        }
    }

    for (let b=0; b<things.length; b++){
        //alert(thing.sendTo);
        var newSendTo = [];
        for (let a=0; a< things[b].sendTo.length; a++) {
            var connection = null;
            for(let i=0; i < things.length; i++) {
                if(things[i].id == things[b].sendTo[a].node) {
                    connection = things[i];
                    break;
                }
            }
            if (connection != null) {
                newSendTo.push(new Relation(things[b].sendTo[a].rel, connection));
                connection.receiveFrom.push(new Relation(things[b].sendTo[a].rel, things[b]));
            }
        }

        things[b].sendTo = newSendTo;

    }

    return things;
}

function getThingsFromId(id) {

    for(let i=0; i < things.length; i++) {
        if(things[i].id == id) {
            return things[i];
        }
    }

    return null;
}

function hovering(that)
{
    that.setAttribute("hovering", "1");
}

function nothovering(that)
{
    that.setAttribute("hovering", "0");
}

function setanchor(event, that)
{
    var body = document.getElementsByTagName("BODY")[0];

    that.setAttribute("anchorx", body.getAttribute("x"));
    that.setAttribute("anchory", body.getAttribute("y"));
    that.setAttribute("anchor", "1");
}

function removeanchor(that)
{
    that.setAttribute("anchor", "0");
    circles = document.getElementById("graph").children;

    for(let i=0; i<circles.length; i++)
    {
        if(circles[i].getAttribute("clicked") == "1")
        {
            releasegrab(circles[i]);
        }
    }
}

function releasegrab(that)
{
    var body = document.getElementsByTagName("BODY")[0];
    var graph = document.getElementById("graph");
    var x = parseInt(body.getAttribute("x"));
    var y = parseInt(body.getAttribute("y"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));
    var scale = parseFloat(graph.getAttribute("scale"));
    var mousex = (x-panx)/scale;
    var mousey = (y-pany)/scale;

    that.setAttribute('clicked', 0);
    that.setAttribute('velx',50*(mousex-parseFloat(that.getAttribute('x')))/scale);
    that.setAttribute('vely',50*(mousey-parseFloat(that.getAttribute('y')))/scale);
}

function initializeInfoButton(){
    document.getElementById("info-button").addEventListener("click", function(event) {
       event.preventDefault();
       openInfo();
   });
}

function openInfo(){
    document.getElementById("info").classList.remove("hidden");
    document.getElementById("modal").classList.remove("hidden");
}

function clearPanels() {
    var panels = document.getElementsByClassName("circlePanel");
    while(0<panels.length) {
        document.getElementsByClassName("circlePanel")[0].remove();
    }
}

function initializeZooming(e){
    e.preventDefault();
    var body = document.getElementsByTagName("BODY")[0];
    var graph = document.getElementById("graph");
    clearPanels();
    var x = parseInt(body.getAttribute("x"));
    var y = parseInt(body.getAttribute("y"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));

    var dir = Math.sign(e.deltaY);
    var scale = parseFloat(graph.getAttribute("scale"));
    if(dir == 1)
    {
        var newscale = scale*0.9;
    }
    else
    {
        var newscale = scale/0.9;
    }
    graph.setAttribute("scale", newscale);

    var panx = x - ((x-panx)/scale)*newscale;
    var pany = y - ((y-pany)/scale)*newscale;

    graph.setAttribute("panx", panx);
    graph.setAttribute("pany", pany);

    graph.style.backgroundPositionX = String(panx) + "px";
    graph.style.backgroundPositionY = String(pany) + "px";
    graph.style.backgroundSize = String(newscale*25) + "px";
}

function placein()
{
    var graph = document.getElementById("graph");
    var circles = document.getElementById("circles");
    var children = circles.children;

    var scale = parseFloat(graph.getAttribute("scale"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));

    var body = document.body;

    for (let i=0; i<things.length; i++) {
        var thing = things[i];
        var circle = document.getElementById(thing.id);

        var size = 2*scale*thing.mass;
        if($(circle).is(':hover')) {
            if(2*scale*thing.mass < 100) {
                circle.children[0].classList.add("tooSmall");
                circle.children[0].style.fontSize = String(Math.ceil(150/8)) + "px";
            } else {
                circle.children[0].classList.remove("tooSmall");
                circle.children[0].style.fontSize = String(Math.ceil(size/8)) + "px";
            }
        } else {
            circle.children[0].classList.remove("tooSmall");
            circle.children[0].style.fontSize = String(Math.ceil(size/8)) + "px";
        }

        circle.style.width = String(size) + "px";
        circle.style.height = String(size) + "px";
        circle.style.borderRadius = String(size) + "px";
        circle.style.filter = "drop-shadow(0 0 " + String(size/20) + "px black)";

        circle.style.left = String(panx + scale*thing.x - size/2) + "px";
        circle.style.top = String(pany + scale*thing.y - size/2) + "px";
    }

    for (let a=0; a<things.length; a++)
    {
        var thingA = things[a];

        for(let b=0; b<document.getElementById(thingA.id).children.length; b++)
        {
            var line = document.getElementById(thingA.id).children[b];
            if(line.classList.contains("line"))
            {
                thingB = getThingsFromId(line.getAttribute("target"));

                if (thingB!= null)
                {
                    var dX = thingB.x - thingA.x;
                    var dY = thingB.y - thingA.y;

                    var d = Math.sqrt((dX*dX) + (dY*dY));
                    var thick = parseInt(line.getAttribute("count"));


                    var length = d-thingA.mass-thingB.mass;
                    var xoff = (dX/d)*(thingA.mass+length/2);
                    var yoff = (dY/d)*(thingA.mass+length/2);

                    line.style.transform = "rotate(0deg)";
                    line.style.width = String(length*scale)+"px";
                    line.style.height = "0.1px";
                    line.style.left = String((thingA.mass-length/2)*scale) + "px";
                    line.style.top = String((thingA.mass)*scale) + "px";
                    line.style.transform = "rotate(" + String((180/Math.PI)*Math.atan(dY/dX)) + "deg)";
                    line.style.left = String((thingA.mass-length/2+xoff)*scale) + "px";
                    line.style.top = String((thingA.mass+yoff)*scale) + "px";
                    line.style.height = String(thick*scale*0.1)+"px";
                }
            }
        }
    }
}

function likeGraph()
{
    var urlParts = window.location.href.split("/");
    urlParts[5] = "like";
    var url = urlParts.join("/");
    $.ajax({
        type: 'POST',
        url: url,
        data: {},
        dataType: "text",
        success: function(data){
             console.log(data);
             if (data=="like") {
                document.getElementById('like-count').innerHTML = parseInt(document.getElementById('like-count').innerHTML)+1;
             } else {
                document.getElementById('like-count').innerHTML = parseInt(document.getElementById('like-count').innerHTML)-1;
             }

             document.getElementById("like-button").classList.toggle("active");
             document.getElementById("like-button").classList.toggle("inactive");
       }
    });
}

function bookmarkGraph()
{
    var urlParts = window.location.href.split("/");
    urlParts[5] = "bookmark";
    var url = urlParts.join("/");
    $.ajax({
        type: 'POST',
        url: url,
        data: {},
        dataType: "text",
        success: function(data){
             console.log(data);

            document.getElementById("bookmark-button").classList.toggle("active");
            document.getElementById("bookmark-button").classList.toggle("inactive");
       }
    });
}

function initializeSubmitButton() {
    document.getElementById("quiz-submit").addEventListener("click", function(event) {
       event.preventDefault();
       nextQuestion();
   });
}

function initializeLikeButton() {
    document.getElementById("like-button").addEventListener("click", function(event) {
       event.preventDefault();
       likeGraph();
   });
}

function initializeBookmarkButton() {
    document.getElementById("bookmark-button").addEventListener("click", function(event) {
       event.preventDefault();
       bookmarkGraph()
   });
}

function getNodeDistance(a, b, met) {
    if (a==b) {
        return 0;
    }

    met.push(a);

    if (a.sendTo.length > 0) {
        var shortest = null;
        for (let i=0; i<a.sendTo.length; i++) {
            if (met.includes(a.sendTo[i].node) == false) {
                var d = getNodeDistance(a.sendTo[i].node, b, met);
                if (d != null) {
                    if (shortest == null) {
                        shortest = d;
                    }
                    if (d < shortest) {
                        shortest = d;
                    }
                }
            }
        }
        if (shortest != null) {
            return shortest + 1
        } else {
            return null
        }
    } else {
        return null
    }
}

function getDependants(node) {
    var dependants = [node];
    var newDependants = [];

    for (let i=0; i<node.receiveFrom.length; i++) {
        newDependants.push(node.receiveFrom[i].node);
    }

    while (newDependants.length > 0) {
        console.log(newDependants);
        var next = [];
        for (let i=0; i<newDependants.length; i++) {
            for (let a=0; a<newDependants[i].receiveFrom.length; a++) {
                if(dependants.includes(newDependants[i].receiveFrom[a].node) == false && newDependants.includes(newDependants[i].receiveFrom[a].node) == false && next.includes(newDependants[i].receiveFrom[a].node) == false) {
                    next.push(newDependants[i].receiveFrom[a].node);
                }
            }
        }
        dependants = dependants.concat(newDependants);
        newDependants = next;
    }

    return dependants;
}


function gvpan(focus, timeline) {;
    var progress = timeline*timeline;
    var graph = document.getElementById("graph");
    var currentScale = parseFloat(graph.getAttribute("scale"));
    var targetScale = 50/focus.mass;

    var scale = currentScale + (targetScale - currentScale) * progress;

    if (document.body.offsetWidth > 720) {
        var targetX = document.body.offsetWidth/2 - targetScale*focus.x;
        var targetY = document.body.offsetHeight/3 - targetScale*focus.y;
    } else {
        var targetX = document.body.offsetWidth/2 - targetScale*focus.x;
        var targetY = document.body.offsetHeight/4 - targetScale*focus.y;
    }
    var currentX = parseFloat(graph.getAttribute("panx"));
    var currentY = parseFloat(graph.getAttribute("pany"));

    var panx = currentX + (targetX - currentX) * progress;
    var pany = currentY + (targetY - currentY) * progress;

    graph.setAttribute("panx", panx);
    graph.setAttribute("pany", pany);
    graph.setAttribute("scale", scale);

    graph.style.backgroundPositionX = String(panx) + "px";
    graph.style.backgroundPositionY = String(pany) + "px";
    graph.style.backgroundSize = String(scale*25) + "px";
}

var questionNode;

function getRandomNode() {
    var node = things[Math.floor(Math.random()*things.length)];
    return node;
}

function getRandomRel() {
    var node = getRandomNode();
    while(node.sendTo.length < 1) {
        var node = getRandomNode();
    }
    var rel = node.sendTo[Math.floor(Math.random()*node.sendTo.length)].rel;

    return [node, rel];
}

answer = [];

function testRel() {
    answer = [];
    var q = getRandomRel();
    questionNode = q[0];
    document.getElementById(questionNode.id).classList.add("inspected");

    for (let i=0; i<q[0].sendTo.length; i++) {
        if (q[0].sendTo[i].rel == q[1]) {
            answer.push(q[0].sendTo[i].node.id);
        }
    }

    var question = "<b>" + q[0].name + "</b> " + q[1] + " <span class='unknown'>?????</span>";

    document.getElementById("question").innerHTML = question;
    document.getElementById("question-small").innerHTML = "Select the node which satisfies the relationship";

    var zoomToIndex = 0;
    var time = 50;
    var zoomTo = setInterval(function () {
        gvpan(questionNode, zoomToIndex/time);
        zoomToIndex += 1;

        if(zoomToIndex > time) {
            clearInterval(zoomTo);
        }
    }, 0.1);
}

let zoomOutStart;
let duration = 2000;

function zoomOut(timeStamp) {

    if(zoomOutStart === undefined) {
        zoomOutStart = timeStamp;
        requestAnimationFrame(zoomOut);
    } else if (timeStamp - zoomOutStart < duration) {
        var progress = (timeStamp - zoomOutStart)/ duration;
        console.log(progress);
        progress = progress * progress;

        var currentScale = parseFloat(graph.getAttribute("scale"));

        var scale = currentScale + (5 - currentScale) * progress;

        var currentX = parseFloat(graph.getAttribute("panx"));
        var currentY = parseFloat(graph.getAttribute("pany"));

        var panx = currentX + (800 - currentX) * progress;
        var pany = currentY + (400 - currentY) * progress;

        graph.setAttribute("panx", panx);
        graph.setAttribute("pany", pany);
        graph.setAttribute("scale", scale);
        
        graph.style.backgroundPositionX = String(panx) + "px";
        graph.style.backgroundPositionY = String(pany) + "px";
        graph.style.backgroundSize = String(scale*25) + "px";    

        requestAnimationFrame(zoomOut);
    } else {
        zoomOutStart = undefined;
    }
}

function testDescription() {
    answer = [];
    var node = getRandomNode();

    answer.push(node.id);

    document.getElementById("inspector-desc").innerHTML = prepareText(node.desc);
    document.getElementById("inspector").style.display = "block";
    document.getElementById("question").innerHTML = "<b>Find the node</b>";
    document.getElementById("question-small").innerHTML = "Select the node with the description on the right";

    requestAnimationFrame(zoomOut);
}

function checkAnswer() {
    if(answer.sort().toString() == selected.sort().toString()) {
        return true;
    }
    return false;
}

function nextQuestion() {
    if(checkAnswer()) {
        alert("True");
    } else {
        alert(answer);
    }
    deselect();
    document.getElementById("inspector").style.display = "none";
    document.getElementById("question").innerHTML = "";
    document.getElementById(questionNode.id).classList.remove("inspected");

    var type = Math.floor(Math.random()*2);
    if(type==0) {
        testRel();
    } else {
        testDescription();
    }
}
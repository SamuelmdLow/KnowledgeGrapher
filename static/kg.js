var old = "";
var things = [];
var nodeEdit = false;
var edittedNode;
var simplemde;

function onload()
{
    var saved = document.getElementById("saved").value;
    things = processInput(saved);
    document.getElementById("input").value = convertToMarkUp(things);
    setup(processInput(saved));
    setInterval(update, 1);
    setInterval(checkSave, 1000);
    simplemde = new SimpleMDE({ toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "guide"],
    element: document.getElementById("nodeEditor-desc"),
    previewRender: function(plainText) {
        let clean = DOMPurify.sanitize(plainText, {USE_PROFILES: {html: true}});
        setTimeout(showMath, 1);
        return marked.parse(clean);
    },
    status: false,});

    document.getElementById("graph").setAttribute("ondblclick", "closeNodeEdit(); closeMarkup();");
}

function showMath()
{
MathJax.typesetPromise();
//alert("math shown?");
}

function convertToMarkUp(things)
{
    var complete = "";

    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        complete = complete + thing.id + "{\nname:" + thing.name;
         if (thing.image != "null" && thing.image != ""){
            complete = complete + "\nimage:" + thing.image;
         }
        complete = complete + "\ndesc:" + thing.desc +"\n---\n";
        for(let x=0; x<thing.sendTo.length; x++)
        {
            complete = complete + thing.sendTo[x].rel + " -> " + thing.sendTo[x].node.id + "\n";
        }
        complete = complete + "}\n";
    }

    return complete;
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
        circle.setAttribute("onmousedown", "circleMouseDown(event,this);");
        circle.setAttribute("onmouseup", "releasegrab(this);");
        circle.style.backgroundImage = "url('"+thing.image+"')";
        circle.addEventListener("contextmenu", (e) => {e.preventDefault()});
        circle.addEventListener("mouseover", function(event) {
            if (event.ctrlKey) {
                circle.style.cursor = "crosshair";
            } else {
                circle.style.cursor = "grab";
            }
            graph.setAttribute("hovered", parseInt(graph.getAttribute("hovered"))+1);
        });
        circle.setAttribute("ondblclick", "editNode(" + "'" + thing.id + "'" + ");");

        circle.addEventListener("mouseout", function(event) {
            circle.style.cursor = "grab";
            graph.setAttribute("hovered", parseInt(graph.getAttribute("hovered"))-1);
        });

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
}

function circleMouseDown(event, that) {
    if (event.ctrlKey) {
        if (document.getElementById("newRel"))
        {
            id = document.getElementById("newRel").getAttribute("owner");
            thing = getThingsFromId(id);
            removeanchor(document.getElementById("graph"));
            rel = prompt("Fill in the relationship\n\n " + thing.name + " ______ " + getThingsFromId(that.id).name);
            removeanchor(document.getElementById("graph"));
            if (rel != null) {
                if (getThingsFromId(that.id) != null) {
                    thing.sendTo.push(new Relation(rel, getThingsFromId(that.id)));
                    getThingsFromId(that.id).receiveFrom.push(new Relation(rel, thing));
                }

                document.getElementById("input").value = convertToMarkUp(things);
                saveGraph();

                document.getElementById("newRel").remove();

                var line = document.createElement("DIV");
                line.classList.add("line");
                line.setAttribute("target", that.id);
                line.setAttribute("count", 1);
                document.getElementById(id).appendChild(line);
                redraw();
            }
        } else {
            var line = document.createElement("DIV");
            line.id = "newRel";
            line.classList.add("line");
            line.setAttribute("owner", that.id)
            line.setAttribute("count", 1);
            document.getElementById("graph").appendChild(line);
        }
    } else if (event.button == 0) {
        that.setAttribute('clicked', 1);
        clearPanels();
    } else if (event.button == 2) {
        clearPanels();
        circleOptionPanel(that);
    }
}

function circleOptionPanel(that) {
    var body = document.getElementsByTagName("BODY")[0];
    var panel = document.createElement("DIV");
    panel.classList.add("circlePanel");
    panel.style.position = "absolute";
    panel.style.left = body.getAttribute("x") + "px"
    panel.style.top = String(parseInt(body.getAttribute("y"))-60) + "px";
    panel.innerHTML = "<p class='panelButton' onclick='deleteNode(" + '"' + that.id + '",this' + ")'>Delete node</p><p class='panelButton' onclick='editNode(" + '"' + that.id + '"' + ");this.parentNode.remove();'>Edit node</p>";
    panel.addEventListener("contextmenu", (e) => {e.preventDefault()});
    document.getElementById("panels").appendChild(panel);
}

function editNode(id) {
    closeMarkup();
    if (nodeEdit != true) {
        openNodeEdit();
    }

    for (let i=0; i<things.length; i++) {
        if (things[i].id == id) {
            edittedNode = things[i];
            break;
        }
    }

    document.getElementById("nodeEditor-name").value = edittedNode.name;
    //document.getElementById("nodeEditor-desc").value = edittedNode.desc;
    simplemde.value(edittedNode.desc);
    document.getElementById("nodeEditor-id").innerHTML = id;

    //that.parentNode.remove();
}

function openNodeEdit() {
    var nodeEditor = document.getElementById("inspector");
    nodeEditor.classList.add("show-nodeEditor");
    nodeEditor.classList.remove("hidden-nodeEditor");
    nodeEdit = true;
}

function closeNodeEdit() {
    var nodeEditor = document.getElementById("inspector");
    nodeEditor.classList.remove("show-nodeEditor");
    nodeEditor.classList.add("hidden-nodeEditor");
    nodeEdit = false;
}

function closeMarkup() {
    var markup = document.getElementById("input");
    markup.classList.add("hidden-markup");
    markup.classList.remove("show-markup");
    document.getElementById("markup-button").innerHTML = "Open Markup";
}

function openMarkup() {
    var markup = document.getElementById("input");
    document.getElementById("markup-button").innerHTML = "Close Markup";
    markup.classList.remove("hidden-markup");
    markup.classList.add("show-markup");
    markup.value = convertToMarkUp(things);
    old = convertToMarkUp(things);
    closeNodeEdit();
    nodeEdit = false;
}

function toggleMarkup() {
    var markup = document.getElementById("input");
    if (markup.classList.contains("hidden-markup")) {
        openMarkup();
    } else {
        closeMarkup();
    }
}

function deleteNode(id, that) {
    if (confirm("Delete this node '" + id + "'?")) {
        for(let x in things) {
            if(things[x].id == id) {
                things.splice(x,1);
                break;
            }
        }

        for(let x in things) {
            let y = 0;
            while (y < things[x].sendTo.length) {
                if(things[x].sendTo[y].node.id == id) {
                    things[x].sendTo.splice(y,1);
                } else {
                    y = y + 1;
                }
            }
        }

        document.getElementById("input").value = convertToMarkUp(things);
        that.parentNode.remove();
        saveGraph();
        redraw();
    }
}

function clearPanels() {
    var panels = document.getElementsByClassName("circlePanel");
    while(0<panels.length) {
        document.getElementsByClassName("circlePanel")[0].remove();
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


function update()
{
    var input = document.getElementById("input").value;
    var graph = document.getElementById("graph");
    if (nodeEdit == false) {
        if (old != input)
        {
            things = processInput(input);
            old = input;
            redraw();
            if(graph.getAttribute("saved")=="1")
            {
                saveGraph();
            }
        }
    } else {
        var name = document.getElementById("nodeEditor-name").value;
        //var desc = document.getElementById("nodeEditor-desc").value;
        var desc = simplemde.value();
        var id = document.getElementById("nodeEditor-id").innerHTML;

        if (things.includes(edittedNode)) {
            if (edittedNode.name != name) {
                edittedNode.name = name;
                saveGraph();
                redraw();
            }
            if (edittedNode.desc != desc) {
                edittedNode.desc = desc;
                saveGraph();
            }
        } else {
            closeNodeEdit();
            openMarkup();
        }
    }

    physics();

    if(parseFloat(graph.getAttribute("energy")) > 0.0001 && graph.getAttribute("saved") == "1")
    {
        var savebutton = document.getElementById("saveButton");
        graph.setAttribute("saved", 0);
        savebutton.innerHTML = "Unsaved";
        //savebutton.style.backgroundColor = "#cfcfcf";
    }

}

function checkSave(){
    var savebutton = document.getElementById("saveButton");
    var input = document.getElementById("input").value;
    var graph = document.getElementById("graph");

    if(parseFloat(graph.getAttribute("energy")) < 0.0001)
    {
        if(graph.getAttribute("saved") == "0")
        {
            saveGraph();
            graph.setAttribute("saved", 1);
        }
    }
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

    console.log("Hey");
    for (let b=0; b<things.length; b++){
        //alert(thing.sendTo);
        console.log(things[b].sendTo);
        var newSendTo = [];
        for (let a=0; a< things[b].sendTo.length; a++) {
            var connection = null;
            for(let i=0; i < things.length; i++) {
                if(things[i].id == things[b].sendTo[a].node) {
                    connection = things[i];
                    break;
                }
            }
            console.log(connection);
            if (connection != null) {
                newSendTo.push(new Relation(things[b].sendTo[a].rel, connection));
                connection.receiveFrom.push(new Relation(things[b].sendTo[a].rel, things[b]));
            }
        }
        console.log(newSendTo);
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

function trickleUp(node, worklist, visited)
{
    //oops
}

function redraw()
{
    var graph = document.getElementById("graph");
    var circles = document.getElementById("circles");
    var scale = parseFloat(graph.getAttribute("scale"));

    var children = circles.children;
    var existing = [];

    for (let i=0; i<children.length; i++)
    {
        existing.push(children[i].id);
    }

    for (let i=0; i<things.length; i++)
    {
        thing = things[i];

        if (existing.includes(thing.id))
        {
            var circle = document.getElementById(thing.id);
            circle.children[0].innerHTML = thing.name;
            var mass = thing.mass;
            circle.children[0].style.fontSize = String(Math.ceil(scale*mass/4)) + "px";
            var lines = circle.children;

            for(let n=1; n<lines.length; n++)
            {
                lines[n].setAttribute("count",0);
            }

            var attracts = [];
            for(let x=0;x<thing.sendTo.length; x++)
            {
                attracts.push(thing.sendTo[x].node.id);

                var lineexists = false;
                for(let n=1; n<lines.length; n++)
                {
                    if(lines[n].getAttribute("target")==thing.sendTo[x].node.id)
                    {
                        lines[n].setAttribute("count",parseInt(lines[n].getAttribute("count"))+1);
                        lineexists = true;
                    }
                }

                if(lineexists==false)
                {
                    var line = document.createElement("DIV");
                    line.classList.add("line");
                    line.setAttribute("target", thing.sendTo[x].node.id);
                    line.setAttribute("count", 1);
                    circle.appendChild(line);
                }
            }

            for(let n=1; n<lines.length; n++)
            {
                if(lines[n].getAttribute("count")=="0")
                {
                    lines[n].remove();
                }
            }

            circle.style.backgroundImage = "url('"+thing.image+"')";
            existing.splice(existing.indexOf(thing.id),1);

            if(thing.image!="null" && thing.image!=null && thing.image!="")
            {
                circle.style.color = "white";
                circle.style.textShadow = "2px 2px 4px #000000";
            }
        }
        else
        {

            const circle = document.createElement("DIV");
            circle.classList.add("circle");
            circle.id = thing.id;
            if(thing.x==null)
            {
                thing.x = Math.random()
            }

            if(thing.y==null)
            {
                thing.y = Math.random();
                circle.setAttribute("y", thing.y);
            }
            circle.setAttribute("onmousedown", "circleMouseDown(event,this);");
            circle.setAttribute("onmouseup", "releasegrab(this);");
            circle.style.backgroundImage = "url('"+thing.image+"')";

            circle.addEventListener("contextmenu", (e) => {e.preventDefault()});
            circle.addEventListener("mouseover", function(event) {
                if (event.ctrlKey) {
                    circle.style.cursor = "crosshair";
                } else {
                    circle.style.cursor = "grab";
                }
                graph.setAttribute("hovered", parseInt(graph.getAttribute("hovered"))+1);
            });
            circle.setAttribute("ondblclick", "editNode(" + "'" + thing.id + "'" + ");");

            circle.addEventListener("mouseout", function(event) {
                circle.style.cursor = "grab";
                graph.setAttribute("hovered", parseInt(graph.getAttribute("hovered"))-1);
            });

            circle.addEventListener("wheel", function(e) {
                initializeZooming(e);
            },{passive:false});

            const name = document.createElement("p");
            name.innerHTML = thing.name;
            name.classList.add("name");
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

            circles.appendChild(circle);
        }
    }

    for (let i=0;i<existing.length; i++)
    {
        document.getElementById(existing[i]).remove();
    }

    var graph = document.getElementById("graph");
    var circles = document.getElementById("circles");
    var children = circles.children;

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
        document.getElementById(thingA.id).style.width = String(2*scale*parseFloat(thingA.mass))+"px";
        document.getElementById(thingA.id).style.height = String(2*scale*parseFloat(thingA.mass))+"px";
    }
    MathJax.typesetPromise();
}

function separateGraph(nodes)
{
    var graphs = []
    for (let n=0; n<nodes.length;n++) {
        var alreadyIncluded = false;
        for (let g=0; g<graphs.length;g++) {
            if (graphs[g].includes(nodes[n])) {
                alreadyIncluded = true;
                break;
            }
        }
        if(alreadyIncluded == false) {
            graphs.push(graphFromNode(nodes[n],[],[]));
        }
    }

    return graphs;
}

function graphFromNode(node, graph, worklist) {
    graph, worklist = addNode(node,graph,worklist)

    while (worklist.length > 0) {
        var node = worklist.pop();
        graph, worklist = addNode(node, graph, worklist);
    }

    return graph
}

function addNode(node, graph, worklist) {
    //console.log("Source node: " + node.id);
    graph.push(node);
    for (let i=0; i<node.sendTo.length; i++) {
        if (graph.includes(node.sendTo[i].node) == false && worklist.includes(node.sendTo[i].node) == false && node.sendTo[i].node != null)
        {
            //console.log(" > " + node.sendTo[i].node.id);
            worklist.push(node.sendTo[i].node);
        }
    }
    for (let i=0; i<node.receiveFrom.length; i++) {
        if (graph.includes(node.receiveFrom[i].node) == false && worklist.includes(node.receiveFrom[i].node) == false  && node.receiveFrom[i].node != null)
        {
            //console.log(" > " + node.receiveFrom[i].node.id);
            worklist.push(node.receiveFrom[i].node);
        }
    }
    return graph, worklist;
}

function physics()
{
    var graph = document.getElementById("graph");
    var circles = document.getElementById("circles");
    var children = circles.children;
    var friction = parseFloat(graph.getAttribute("energy"));

    var repel = parseFloat(graph.getAttribute("repel"));
    var attract = parseFloat(graph.getAttribute("attract"));

    var scale = parseFloat(graph.getAttribute("scale"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));

    var commands = []

    var grabbed = false;

    var energy = 0;
    var body = document.body;

    if (document.getElementById("newRel"))
    {
        var newrel = document.getElementById("newRel");

        thingA = getThingsFromId(newrel.getAttribute("owner"));
        //console.log(thingA);
        var dX = parseInt(body.getAttribute("x")) - (thingA.x*scale + panx);
        var dY = parseInt(body.getAttribute("y")) - (thingA.y*scale + pany);

        var d = Math.sqrt((dX*dX) + (dY*dY));

        //var length = d-thingA.mass*scale;
        var xoff = (dX/d)*(d/2);
        var yoff = (dY/d)*(d/2);

        newrel.style.transform = "rotate(0deg)";
        newrel.style.width = String(d)+"px";
        newrel.style.height = "0.1px";
        newrel.style.left = String((thingA.x*scale + panx)+dX/2-d/2) + "px";
        newrel.style.top = String((thingA.y*scale + pany)+dY/2) + "px";
        newrel.style.transform = "rotate(" + String((180/Math.PI)*Math.atan(dY/dX)) + "deg)";
        newrel.style.height = String(scale*0.1)+"px";
    }

    var graphs = separateGraph(things);
    for (let g=0; g<graphs.length; g++) {
        commands = [];
        for(let a=0; a<graphs[g].length; a++)
        {
            var thingA = graphs[g][a];
            if (Number.isNaN(thingA.x)) {
                console.log("broke")
                thingA.x = Math.random();
            }
            if (Number.isNaN(thingA.y)) {
                console.log("broke")
                thingA.y = Math.random();
            }
            var accX = 0;
            var accY = 0;

            if(document.getElementById(thingA.id).getAttribute("clicked")=="1")
            {
                var body = document.getElementsByTagName("BODY")[0];
                var x = (parseInt(body.getAttribute("x")) - panx)/ scale;
                var y = (parseInt(body.getAttribute("y")) - pany)/ scale;

                commands.push([a,x,y,0,0]);
                grabbed =  true;
            }
            else
            {
                for(let b=0; b<graphs[g].length; b++)
                {
                    if (a != b)
                    {
                        var thingB = graphs[g][b];

                        if (Number.isNaN(thingB.x)) {
                            console.log("broke");
                            thingB.x = Math.random();
                        }
                        if (Number.isNaN(thingB.y)) {
                            console.log("broke");
                            thingB.y = Math.random();
                        }


                        var odX = thingB.x - thingA.x;
                        var odY = thingB.y - thingA.y;
                        var od = Math.sqrt((odX * odX) + (odY * odY));

                        var barrier = thingA.mass + thingB.mass;

                        var d = od - barrier;

                        if (od!=0)
                        {
                            var dX = odX * (Math.abs(d)/od);
                            var dY = odY * (Math.abs(d)/od);
                        }
                        else
                        {
                            var dX = 0;
                            var dY = 0;
                        }
                        if (0>= d)
                        {
                            console.log("singularity");
                            if(odX==0)
                            {
                                accX = accX - (100*thingB.mass*(Math.round(Math.random()) -0.5))*thingA.mass;
                            }
                            else
                            {
                                accX = accX - 20*(repel*(thingB.mass/od)*(odX/od));
                            }

                            if(odY==0)
                            {
                                accY = accY - (100*thingB.mass)*(Math.round(Math.random()) -0.5)*thingA.mass;
                            }
                            else
                            {
                                accY = accY - 20*(repel*(thingB.mass/od)*(odY/od));
                            }
                        }
                        else
                        {
                            accX = accX - (repel*(thingB.mass/d)*(dX/d));
                            accY = accY - (repel*(thingB.mass/d)*(dY/d));
                        }

                        //attracts
                        var count = 0;
                        for(let i=0; i<thingA.sendTo.length; i++)
                        {
                            if(thingA.sendTo[i].node.id==thingB.id)
                            {
                                count=count+1;
                            }
                        }

                        for(let i=0; i<thingB.sendTo.length; i++)
                        {
                            //console.log(thingB.sendTo[i].node);
                            if(thingB.sendTo[i].node==thingA)
                            {
                                count=count+1;
                            }
                        }
                        var accX = accX + (count*(attract*dX))/thingA.mass;
                        var accY = accY + (count*(attract*dY))/thingA.mass;
                    }
                }


                var velx = thingA.velx + accX;
                var vely = thingA.vely + accY;

                var vel = Math.sqrt((velx*velx) + (vely*vely));


                if(friction > 0.0001)
                {
                    if (Math.abs(vel) < friction || vel==0)
                    {
                        var fricvel = 0;
                    }
                    else
                    {
                        var fricvel = vel - friction*(vel/Math.abs(vel));
                    }
                }
                else
                {
                    if (Math.abs(vel) < 0.0001 || vel==0)
                    {
                        var fricvel = 0;
                    }
                    else
                    {
                        var fricvel = vel - 0.0001*(vel/Math.abs(vel));
                    }
                }

                energy = energy + 0.5 * thingA.mass * fricvel * fricvel;

                if (vel==0)
                {
                    velx = 0;
                    vely = 0;
                }
                else
                {
                    velx = velx * (fricvel/vel);
                    vely = vely * (fricvel/vel);
                }
                var x = thingA.x + velx;
                var y = thingA.y + vely;

                commands.push([a,x,y,velx,vely]);
            }

        }
        for (let i=0; i<commands.length; i++)
        {
            var thing = graphs[g][commands[i][0]];
            var circle = document.getElementById(thing.id);

            thing.x = parseFloat(commands[i][1]);
            thing.y = parseFloat(commands[i][2]);
            thing.velx = parseFloat(commands[i][3]);
            thing.vely = parseFloat(commands[i][4]);

            circle.children[0].style.fontSize = String(Math.ceil(scale*thing.mass/4)) + "px";

            circle.style.width = String(2*scale*thing.mass)+"px";
            circle.style.height = String(2*scale*thing.mass)+"px";

            circle.style.left = String(panx + scale*thing.x - scale*thing.mass) + "px";
            circle.style.top = String(pany + scale*thing.y - scale*thing.mass) + "px";
            circle.style.borderRadius = String(scale*thing.mass*2) + "px";
        }

    }

    graph.setAttribute("energy", energy);

    if(graph.getAttribute("anchor")=="1" && grabbed==false)
    {
        var body = document.getElementsByTagName("BODY")[0];
        panx = panx + (parseInt(body.getAttribute("x")) - parseInt(graph.getAttribute("anchorx")));
        pany = pany + (parseInt(body.getAttribute("y")) - parseInt(graph.getAttribute("anchory")));

        graph.setAttribute("anchorx", body.getAttribute("x"));
        graph.setAttribute("anchory", body.getAttribute("y"));

        graph.setAttribute("panx", panx);
        graph.setAttribute("pany", pany);

        graph.style.backgroundPositionX = String(Math.floor(panx)) + "px";
        graph.style.backgroundPositionY = String(Math.floor(pany)) + "px";
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

function hovering(that, event)
{
    that.setAttribute("hovering", "1");

    if (event.ctrlKey) {
        that.classList.add("crossing");
    } else {
        that.classList.remove("crossing");
    }
}

function nothovering(that)
{
    that.setAttribute("hovering", "0");
}

function setanchor(event, that)
{
    console.log("anchor set")
    var body = document.getElementsByTagName("BODY")[0];
    clearPanels();
    if (event.ctrlKey == false) {
        if (event.button == 0) {
            that.setAttribute("anchorx", body.getAttribute("x"));
            that.setAttribute("anchory", body.getAttribute("y"));
            that.setAttribute("anchor", "1");
        } else if (event.button == 2) {
            if (graph.getAttribute("hovered") == "0") {
                clearPanels();
                var panel = document.createElement("DIV");
                panel.classList.add("circlePanel");
                panel.style.position = "absolute";
                panel.style.left = body.getAttribute("x") + "px"
                panel.style.top = String(parseInt(body.getAttribute("y"))-30) + "px";
                panel.innerHTML = "<p class='panelButton' onclick='createNode(" +body.getAttribute("x") +","
                 + body.getAttribute("y") + ", this)'>Create node</p>";
                panel.addEventListener("contextmenu", (e) => {e.preventDefault()});
                document.getElementById("panels").appendChild(panel);
            }
        }
    }
}

function createNode(x, y, that)
{
    var graph = document.getElementById("graph");

    var nodex = (parseFloat(x) - parseFloat(graph.getAttribute("panx")))/parseFloat(graph.getAttribute("scale"));
    var nodey = (parseFloat(y) - parseFloat(graph.getAttribute("pany")))/parseFloat(graph.getAttribute("scale"));

    var id = prompt("Enter the new node's id");
    if (id != null) {
        var node = new Thing(id,id,"","",[],[],1,nodex, nodey);
        things.push(node);

        document.getElementById("input").value = convertToMarkUp(things);
        saveGraph();
        redraw();
    }
    that.parentNode.remove();
}

function removeanchor(that)
{
    console.log("remove");
    that.setAttribute("anchor", "0");
    circles = document.getElementById("circles").children;

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
    //that.setAttribute('velx',50*(mousex-parseFloat(that.getAttribute('x')))/scale);
    //that.setAttribute('vely',50*(mousey-parseFloat(that.getAttribute('y')))/scale);
}

window.addEventListener("mousemove", function(event) {
    if(event.ctrlKey == false) {
        if (document.getElementById("newRel")) {
            document.getElementById("newRel").remove();
        }
    }
});

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

    graph.style.backgroundPositionX = String(Math.floor(panx)) + "px";
    graph.style.backgroundPositionY = String(Math.floor(pany)) + "px";
    graph.style.backgroundSize = String(Math.floor(newscale*25)) + "px";
}

function getComplete(things)
{
    var complete = "";

    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        complete = complete + thing.id + "{\nname:" + thing.name + "\nimage:" + thing.image + "\ndesc:" + thing.desc + "\n---\n";
        if (Number.isNaN(thing.x)) {
            complete = complete + "\nx: 0";
        } else {
            complete = complete + "\nx:" + thing.x;
        }
        if (Number.isNaN(thing.y)) {
            complete = complete + "\ny: 0\n";
        } else {
            complete = complete + "\ny:" + thing.y + "\n";
        }

        for(let x=0; x<thing.sendTo.length; x++)
        {
            complete = complete + thing.sendTo[x].rel + " -> " + thing.sendTo[x].node.id + "\n";
        }
        complete = complete + "\n}\n";
    }

    return complete;
}

function saveGraph()
{
    var savebutton = document.getElementById("saveButton");
    savebutton.innerHTML = "Saved";
    //savebutton.style.backgroundColor = "#98bdfb";

    var urlParts = window.location.href.split("/");
    console.log(urlParts);
    urlParts[5] = "save";
    var url = urlParts.join("/");
    var save = getComplete(things);
    $.ajax({
        type: 'POST',
        url: url,
        data: {data: save},
        dataType: "text",
        success: function(data){
                 console.log("Saved");
               }
    });

    var wordcloud = "";
    for (let i=0; i<things.length; i++) {
        var node = "";
        for (let a=0; a<things[i].receiveFrom.length; a++) {
            node = node + "," + things[i].name;
        }
        wordcloud = wordcloud + node;
    }

    console.log(wordcloud);
    document.getElementById("wordcloud").value = wordcloud;
}

function initializeMarkupButton(){
    document.getElementById("markup-button").addEventListener("click", function(event) {
       event.preventDefault();
       toggleMarkup();
   });
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

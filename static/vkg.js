var old = "";

function onload()
{
    var saved = document.getElementById("saved").value;
    setup(processInput(saved));
    window.setInterval(staticUpdate, 1);
}

function staticUpdate()
{
    panning();
    placein();
}

function convertToMarkUp(file)
{
    var things = processInput(file);

    var complete = "";

    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        complete = complete + thing.id + "{\nname:" + thing.name + "\nimage:" + thing.image + "\ndesc:" + thing.desc +"\n";
        for(let x=0; x<thing.relations.length; x++)
        {
            complete = complete + thing.relations[x][0] + " -> " + thing.relations[x][1] + "\n";
        }
        complete = complete + "\n}\n";
    }

    return complete;

}

function uninspect(that)
{
    that.classList.toggle("inspected-circle");
    for(let i=0; i<that.children.length; i++)
    {
        var line = that.children[i];
        if(line.classList.contains("line"))
        {
            line.classList.toggle("inspected-line");
        }
    }

    document.getElementById("graph").setAttribute("inspected", "none");
}

function showInspector(that)
{
    var graph = document.getElementById("graph");
    if(graph.getAttribute("inspected")!="none")
    {
        uninspect(document.getElementById(graph.getAttribute("inspected")));
    }
    that.classList.toggle("inspected-circle");
    graph.setAttribute("inspected", that.id);
    var inspector = document.getElementById("inspector");
    document.getElementById("inspector-name").innerHTML = that.getAttribute("name");
    document.getElementById("inspector-id").innerHTML = that.id;
    document.getElementById("inspector-image").src = that.style.backgroundImage.slice(5,-2);
    document.getElementById("inspector-desc").innerHTML = that.getAttribute("desc");
    var rels = document.getElementById("inspector-rels");
    rels.innerHTML = '';
    for(let i=0; i<that.children.length; i++)
    {
        var line = that.children[i];
        if(line.classList.contains("line"))
        {
            line.classList.toggle("inspected-line");
            var relations = line.getAttribute("rel").split(",");
            for(let x=0; x<relations.length; x++)
            {
                var li = document.createElement("li");
                li.innerHTML = "<p>"+that.getAttribute("name") + " <strong>" + relations[x] + "</strong> " + document.getElementById(line.getAttribute("target")).getAttribute("name") + "</p>";
                rels.appendChild(li);
            }
        }
    }
    MathJax.typesetPromise();
}

function setup(things)
{
    var graph = document.getElementById("graph");
    var scale = parseFloat(graph.getAttribute("scale"));
    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        const circle = document.createElement("DIV");
        circle.classList.add("circle");
        circle.id = thing.id;
        circle.setAttribute("x", thing.x);
        circle.setAttribute("y", thing.y);
        circle.setAttribute("velx", 0);
        circle.setAttribute("vely", 0);
        circle.setAttribute("onclick", "showInspector(this)");
        circle.setAttribute("mass", thing.mass);
        circle.setAttribute("name", thing.name);
        circle.setAttribute("desc", thing.desc);
        circle.style.backgroundImage = "url('"+thing.image+"')";
        if(thing.image!="null")
        {
            circle.style.color = "white";
            circle.style.textShadow = "2px 2px 4px #000000";
        }

        const name = document.createElement("p");
        name.innerHTML = thing.name;
        name.classList.add("name");
        name.style.fontSize = String(Math.ceil(scale*thing.mass/4)) + "px";

        circle.appendChild(name);

        var friends = [];
        var attracts = [];
        for(let x=0;x<thing.relations.length; x++)
        {
            var themId = thing.relations[x][1];
            attracts.push(themId);

            if(friends.includes(themId) == false)
            {
                friends.push(themId);
                var line = document.createElement("DIV");
                line.classList.add("line");
                line.setAttribute("target", themId);
                line.setAttribute("rel",thing.relations[x][0])
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
                        line.setAttribute("rel", line.getAttribute("rel") + "," + thing.relations[x][0])
                        circle.children[n].setAttribute("count",thick);
                        break;
                    }
                }
            }

        }
        circle.setAttribute("relations", attracts.join(","))

        graph.appendChild(circle);
    }

    var children = graph.children;
    for(let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        thingA.setAttribute("mass",1);
        for(let b=0; b<children.length; b++)
        {
            if (a != b)
            {
                var thingB = children[b];
                var attractB = thingB.getAttribute("relations").split(",");
                for(let i=0; i<attractB.length; i++)
                {
                    if(attractB[i]==thingA.id)
                    {
                        thingA.setAttribute("mass", parseFloat(thingA.getAttribute("mass"))+0.5);
                    }
                }
            }
        }
        thingA.style.width = String(2*scale*parseFloat(thingA.getAttribute("mass")))+"px";
        thingA.style.height = String(2*scale*parseFloat(thingA.getAttribute("mass")))+"px";
    }
    //MathJax.typesetPromise();
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
    }
}



function placein()
{
    var graph = document.getElementById("graph");
    var scale = parseFloat(graph.getAttribute("scale"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));
    var children = graph.children;

    for (let i=0; i<children.length; i++)
    {
        thingA = children[i]

        var mass = parseFloat(thingA.getAttribute("mass"));
        var x = parseFloat(thingA.getAttribute("x"));
        var y = parseFloat(thingA.getAttribute("y"));

        thingA.children[0].style.fontSize = String(Math.ceil(scale*mass/4)) + "px";

        thingA.style.width = String(2*scale*mass)+"px";
        thingA.style.height = String(2*scale*mass)+"px";

        thingA.style.left = String(panx + scale*x - scale*mass) + "px";
        thingA.style.top = String(pany + scale*y - scale*mass) + "px";
        thingA.style.borderRadius = String(scale*mass*2) + "px";
    }

    for (let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        var x = parseFloat(thingA.getAttribute("x"));
        var y = parseFloat(thingA.getAttribute("y"));

        for(let b=0; b<thingA.children.length; b++)
        {
            var line = thingA.children[b];
            if(line.classList.contains("line"))
            {
                var thingB = document.getElementById(line.getAttribute("target"));
                if (thingB!= null)
                {
                    var dX = parseFloat(thingB.getAttribute("x")) - x;
                    var dY = parseFloat(thingB.getAttribute("y")) - y;

                    var d = Math.sqrt((dX*dX) + (dY*dY));
                    var thick = parseInt(line.getAttribute("count"));

                    var m = parseFloat(thingA.getAttribute("mass"));
                    var mb = parseFloat(thingB.getAttribute("mass"));

                    var length = d-m-mb;
                    var xoff = (dX/d)*(m+length/2);
                    var yoff = (dY/d)*(m+length/2);

                    line.style.transform = "rotate(0deg)";
                    line.style.width = String(length*scale)+"px";
                    line.style.height = "0.1px";
                    line.style.left = String((m-length/2)*scale) + "px";
                    line.style.top = String((m)*scale) + "px";
                    line.style.transform = "rotate(" + String((180/Math.PI)*Math.atan(dY/dX)) + "deg)";
                    line.style.left = String((m-length/2+xoff)*scale) + "px";
                    line.style.top = String((m+yoff)*scale) + "px";
                    line.style.height = String(thick*scale*0.1)+"px";
                }
            }
        }
    }
}

function Thing(id, name, image, desc, relations, mass, x, y)
{
    this.id = id;
    this.name = name;
    this.image = image;
    this.desc = desc;
    this.relations = relations;
    this.mass = mass;
    this.x = x;
    this.y = y;
}


function update()
{
    var input = document.getElementById("input").value;
    if (old != input)
    {
        old = input;
        redraw();
    }

    physics();

    var graph = document.getElementById("graph");
    var savebutton = document.getElementById("saveButton");
    if(parseFloat(graph.getAttribute("energy")) > 0.0001)
    {
        if(graph.getAttribute("saved") == "1")
        {
            graph.setAttribute("saved", 0);
            savebutton.innerHTML = "Not Saved";
            savebutton.style.backgroundColor = "#cfcfcf";
        }
    }
    else
    {
        if(graph.getAttribute("saved") == "0")
        {
            saveGraph();
            graph.setAttribute("saved", 1);
            savebutton.innerHTML = "Saved";
            savebutton.style.backgroundColor = "#98bdfb";
        }
    }
}

function processInput(input)
{
    var things = []
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
                    var x = parseFloat(xstr.slice(2).trim());
                    thing = thing.replace(xstr, "");
                }
                else
                {
                    var x = null;
                }

                if(thing.includes("y:"))
                {
                    var ystr = thing.slice(thing.indexOf("y:"));
                    var ystr = ystr.slice(0, ystr.indexOf("\n"));
                    var y = parseFloat(ystr.slice(2).trim());
                    thing = thing.replace(ystr, "");
                }
                else
                {
                    var y = null;
                }

                if(thing.includes("desc:"))
                {
                    var desc = thing.slice(thing.indexOf("desc:")+5);
                    desc = desc.slice(0, desc.indexOf("\n")).trim();

                    thing = thing.replace("desc:", "");
                    thing = thing.replace(desc, "");
                }
                else
                {
                    var desc = null;
                }

                while(thing.includes("\n\n"))
                {
                    thing = thing.replace("\n\n", "");
                }

                var rawrelations = thing.split("\n");

                var relations = [];

                for(let x = 0; x<rawrelations.length; x++)
                {
                    if (rawrelations[x].includes("->") && rawrelations[x].length > 1)
                    {
                        var rel = rawrelations[x].split("->");
                        relations.push([rel[0].trim(), rel[1].trim()]);
                    }
                }

                things.push(new Thing(id, name, image, desc, relations, 1,x,y));
            }
        }
    }

    return things
}

function trickleUp(node, worklist, visited)
{
    //oops
}

function redraw()
{
    things = processInput(document.getElementById("input").value);
    var graph = document.getElementById("graph");
    var scale = parseFloat(graph.getAttribute("scale"));

    var children = graph.children;
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
            var mass = parseFloat(circle.getAttribute("mass"));
            circle.children[0].style.fontSize = String(Math.ceil(scale*mass/4)) + "px";
            var lines = circle.children;

            for(let n=1; n<lines.length; n++)
            {
                lines[n].setAttribute("count",0);
            }

            var attracts = [];
            for(let x=0;x<thing.relations.length; x++)
            {
                attracts.push(thing.relations[x][1]);

                var lineexists = false;
                for(let n=1; n<lines.length; n++)
                {
                    if(lines[n].getAttribute("target")==thing.relations[x][1])
                    {
                        lines[n].setAttribute("count",parseInt(lines[n].getAttribute("count"))+1);
                        lineexists = true;
                    }
                }

                if(lineexists==false)
                {
                    var line = document.createElement("DIV");
                    line.classList.add("line");
                    line.setAttribute("target", thing.relations[x][1]);
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

            circle.setAttribute("relations", attracts.join(","))
            circle.style.backgroundImage = "url('"+thing.image+"')";
            existing.splice(existing.indexOf(thing.id),1);


        }
        else
        {

            const circle = document.createElement("DIV");
            circle.classList.add("circle");
            circle.id = thing.id;
            if(thing.x!=null)
            {
                circle.setAttribute("x", thing.x);
            }
            else
            {
                circle.setAttribute("x", Math.random());
            }

            if(thing.y!=null)
            {
                circle.setAttribute("y", thing.y);
            }
            else
            {
                circle.setAttribute("y", Math.random());
            }
            circle.setAttribute("velx", 0);
            circle.setAttribute("vely", 0);
            circle.setAttribute("onmousedown", "this.setAttribute('clicked', 1);");
            circle.setAttribute("onmouseup", "releasegrab(this);");
            circle.setAttribute("mass", thing.mass);
            circle.style.backgroundImage = "url('"+thing.image+"')";

            const name = document.createElement("p");
            name.innerHTML = thing.name;
            name.classList.add("name");
            name.style.fontSize = String(Math.ceil(scale*thing.mass/4)) + "px";

            circle.appendChild(name);

            var friends = [];
            var attracts = [];
            for(let x=0;x<thing.relations.length; x++)
            {
                var themId = thing.relations[x][1];
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
            circle.setAttribute("relations", attracts.join(","))

            graph.appendChild(circle);
        }
    }

    for (let i=0;i<existing.length; i++)
    {
        document.getElementById(existing[i]).remove();
    }

    var graph = document.getElementById("graph");
    var children = graph.children;

    for(let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        thingA.setAttribute("mass",1);
        for(let b=0; b<children.length; b++)
        {
            if (a != b)
            {
                var thingB = children[b];
                var attractB = thingB.getAttribute("relations").split(",");
                for(let i=0; i<attractB.length; i++)
                {
                    if(attractB[i]==thingA.id)
                    {
                        thingA.setAttribute("mass", parseFloat(thingA.getAttribute("mass"))+1);
                    }
                }
            }
        }
        thingA.style.width = String(2*scale*parseFloat(thingA.getAttribute("mass")))+"px";
        thingA.style.height = String(2*scale*parseFloat(thingA.getAttribute("mass")))+"px";
    }
}

function physics()
{
    var graph = document.getElementById("graph");
    var children = graph.children;
    var friction = parseFloat(graph.getAttribute("energy"));

    var repel = parseFloat(graph.getAttribute("repel"));
    var attract = parseFloat(graph.getAttribute("attract"));

    var scale = parseFloat(graph.getAttribute("scale"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));

    var commands = []

    var grabbed = false;

    var energy = 0;

    for(let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        var x = parseFloat(thingA.getAttribute("x"));
        var y = parseFloat(thingA.getAttribute("y"));
        var accX = 0;
        var accY = 0;
        var m = parseFloat(thingA.getAttribute("mass"));

        var attracts = thingA.getAttribute("relations").split(",");

        if(thingA.getAttribute("clicked")=="1")
        {
            var body = document.getElementsByTagName("BODY")[0];
            x = (parseInt(body.getAttribute("x")) - panx)/ scale;
            y = (parseInt(body.getAttribute("y")) - pany)/ scale;

            commands.push([thingA,x,y,0,0]);
            grabbed =  true;
        }
        else
        {
            for(let b=0; b<children.length; b++)
            {
                if (a != b)
                {
                    var thingB = children[b];

                    var mb = parseFloat(thingB.getAttribute("mass"));

                    var odX = parseFloat(thingB.getAttribute("x")) - x;
                    var odY = parseFloat(thingB.getAttribute("y")) - y;
                    var od = Math.sqrt((odX * odX) + (odY * odY));

                    var barrier = (parseFloat(thingA.getAttribute("mass")) + parseFloat(thingB.getAttribute("mass")));

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
                        var col = [thingA.id,thingB.id].sort();
                        if(odX==0)
                        {
                            accX = accX - (100*parseFloat(thingB.getAttribute("mass"))*(Math.round(Math.random()) -0.5))*m;
                        }
                        else
                        {
                            accX = accX - 20*(repel*(mb/od)*(odX/od));
                        }

                        if(odY==0)
                        {
                            accY = accY - (100*parseFloat(thingB.getAttribute("mass"))*(Math.round(Math.random()) -0.5))*m;
                        }
                        else
                        {
                            accY = accY - 20*(repel*(mb/od)*(odY/od));
                        }
                    }
                    else
                    {

                        accX = accX - (repel*(mb/d)*(dX/d));
                        accY = accY - (repel*(mb/d)*(dY/d));
                    }

                    //attracts
                    var count = 0;
                    for(let i=0; i<attracts.length; i++)
                    {
                        if(attracts[i]==thingB.id)
                        {
                            count=count+1;
                        }
                    }

                    var attractB = thingB.getAttribute("relations").split(",");
                    for(let i=0; i<attractB.length; i++)
                    {
                        if(attractB[i]==thingA.id)
                        {
                            count=count+1;
                        }
                    }

                    var accX = accX + (count*(attract*dX))/m;
                    var accY = accY + (count*(attract*dY))/m;
                }
            }

            var velx = parseFloat(thingA.getAttribute("velx")) + accX;
            var vely = parseFloat(thingA.getAttribute("vely")) + accY;

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

            energy = energy + 0.5 * m * fricvel * fricvel;

            if (vel==0)
            {
                velx = 0;
                vely = 0;
            }
            else
            {
                velx = velx * (fricvel/vel);
                vely = vely * (fricvel/vel);
                x = x + velx;
                y = y + vely;
            }

            commands.push([thingA,x,y,velx,vely]);
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
    }

    for (let i=0; i<commands.length; i++)
    {
        thingA = commands[i][0]

        var mass = parseFloat(thingA.getAttribute("mass"));
        thingA.setAttribute("x", commands[i][1]);
        thingA.setAttribute("y", commands[i][2]);

        thingA.setAttribute("velx", commands[i][3]);
        thingA.setAttribute("vely", commands[i][4]);

        thingA.children[0].style.fontSize = String(Math.ceil(scale*mass/4)) + "px";

        thingA.style.width = String(2*scale*mass)+"px";
        thingA.style.height = String(2*scale*mass)+"px";

        thingA.style.left = String(panx + scale*commands[i][1] - scale*mass) + "px";
        thingA.style.top = String(pany + scale*commands[i][2] - scale*mass) + "px";
        thingA.style.borderRadius = String(scale*mass*2) + "px";
    }

    for (let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        var x = parseFloat(thingA.getAttribute("x"));
        var y = parseFloat(thingA.getAttribute("y"));

        for(let b=0; b<thingA.children.length; b++)
        {
            var line = thingA.children[b];
            if(line.classList.contains("line"))
            {
                var thingB = document.getElementById(line.getAttribute("target"));
                if (thingB!= null)
                {
                    var dX = parseFloat(thingB.getAttribute("x")) - x;
                    var dY = parseFloat(thingB.getAttribute("y")) - y;

                    var d = Math.sqrt((dX*dX) + (dY*dY));
                    var thick = parseInt(line.getAttribute("count"));

                    var m = parseFloat(thingA.getAttribute("mass"));
                    var mb = parseFloat(thingB.getAttribute("mass"));

                    var length = d-m-mb;
                    var xoff = (dX/d)*(m+length/2);
                    var yoff = (dY/d)*(m+length/2);

                    line.style.transform = "rotate(0deg)";
                    line.style.width = String(length*scale)+"px";
                    line.style.height = "0.1px";
                    line.style.left = String((m-length/2)*scale) + "px";
                    line.style.top = String((m)*scale) + "px";
                    line.style.transform = "rotate(" + String((180/Math.PI)*Math.atan(dY/dX)) + "deg)";
                    line.style.left = String((m-length/2+xoff)*scale) + "px";
                    line.style.top = String((m+yoff)*scale) + "px";
                    line.style.height = String(thick*scale*0.1)+"px";
                }
            }
        }
    }
}

function hovering(that)
{
    that.setAttribute("hovering", "1");
}

function nothovering(that)
{
    that.setAttribute("hovering", "0");
}

function setanchor(that)
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

window.addEventListener("wheel", function(e) {
    e.preventDefault();
    var body = document.getElementsByTagName("BODY")[0];
    var graph = document.getElementById("graph");
    if(graph.getAttribute("hovering")=="1")
    {
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

        graph.setAttribute("panx", x - ((x-panx)/scale)*newscale);
        graph.setAttribute("pany", y - ((y-pany)/scale)*newscale);
    }
},{passive:false});

function getComplete()
{
    var things = processInput(document.getElementById("input").value);


    for(let i=0; i<things.length; i++)
    {
        var thing = document.getElementById(things[i].id);
        things[i].x = String(parseFloat(thing.getAttribute("x")));
        things[i].y = String(parseFloat(thing.getAttribute("y")));
    }

    var complete = "";

    for(let i=0; i<things.length; i++)
    {
        var thing = things[i];
        complete = complete + thing.id + "{\nname:" + thing.name + "\nimage:" + thing.image + "\ndesc:" + thing.desc + "\nx:" + thing.x + "\ny:" + thing.y + "\n";
        console.log(thing.relations);
        for(let x=0; x<thing.relations.length; x++)
        {
            complete = complete + thing.relations[x][0] + " -> " + thing.relations[x][1] + "\n";
        }
        complete = complete + "\n}\n";
    }
    console.log(complete);
    return complete;
}

function saveGraph()
{
    console.log("save graph");
    var id = window.location.href.split("edit/")[1];
    var save = getComplete();
    $.ajax({
        type: 'POST',
        url: "/save",
        data: {id: id, data: save},
        dataType: "text",
        success: function(data){
                 console.log("Saved");
               }
    });
}
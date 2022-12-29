window.setInterval(update, 20);

function Thing(id, name, image, desc, relations, mass) {
    this.id = id;
    this.name = name;
    this.image = image;
    this.desc = desc;
    this.relations = relations;
    this.mass = mass;
}


function update()
{
    var input = document.getElementById("input").value
    if (document.getElementById("old").value != input)
    {
        document.getElementById("old").value = input;
        redraw();
    }

    physics();
}

function processInput()
{
    var input = document.getElementById("input").value;
    var things = []
    input = input.split("}");
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

                things.push(new Thing(id, name, image, desc, relations, 1));
            }
        }
    }

    return things
}

function trickleUp(node, worklist, visited)
{

}

function redraw()
{
    things = processInput();
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
            var mass = parseInt(circle.getAttribute("mass"));
            circle.children[0].style.fontSize = String(Math.ceil(scale*mass/5)) + "px";

            var attracts = [];
            for(let x=0;x<thing.relations.length; x++)
            {
                attracts.push(thing.relations[x][1]);
            }
            circle.setAttribute("relations", attracts.join(","))

            existing.splice(existing.indexOf(thing.id),1);


        }
        else
        {

            const circle = document.createElement("DIV");
            circle.classList.add("circle");
            circle.id = thing.id;
            circle.setAttribute("x", 0);
            circle.setAttribute("y", 0);
            circle.setAttribute("velx", 0);
            circle.setAttribute("vely", 0);
            circle.setAttribute("onmousedown", "this.setAttribute('clicked', 1);");
            circle.setAttribute("onmouseup", "this.setAttribute('clicked', 0);");
            circle.setAttribute("mass", thing.mass);

            const name = document.createElement("p");
            name.innerHTML = thing.name;
            name.classList.add("name");
            name.style.fontSize = String(Math.ceil(scale*thing.mass/5)) + "px";

            circle.appendChild(name);

            var attracts = [];
            for(let x=0;x<thing.relations.length; x++)
            {
                attracts.push(thing.relations[x][1]);

            }
            circle.setAttribute("relations", attracts.join(","))

            graph.appendChild(circle);
        }

        physics();
    }

    while(0<existing.length)
    {
        document.getElementById(existing[0]).remove();
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
                        thingA.setAttribute("mass", parseInt(thingA.getAttribute("mass"))+1);
                    }
                }
            }
        }
        thingA.style.width = String(2*scale*parseInt(thingA.getAttribute("mass")))+"px";
        thingA.style.height = String(2*scale*parseInt(thingA.getAttribute("mass")))+"px";
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
        var m = parseInt(thingA.getAttribute("mass"));

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

                    var mb = parseInt(thingB.getAttribute("mass"));

                    var odX = parseFloat(thingB.getAttribute("x")) - x;
                    var odY = parseFloat(thingB.getAttribute("y")) - y;
                    var od = Math.sqrt((odX * odX) + (odY * odY));

                    var barrier = (parseInt(thingA.getAttribute("mass")) + parseInt(thingB.getAttribute("mass")));

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
                            accX = accX - (10*parseInt(thingB.getAttribute("mass"))*(Math.round(Math.random()) -0.5))/m;
                        }
                        else
                        {
                            accX = accX - (repel*(mb/od)*(odX/od));
                        }

                        if(odY==0)
                        {
                            accY = accY - (10*parseInt(thingB.getAttribute("mass"))*(Math.round(Math.random()) -0.5))/m;
                        }
                        else
                        {
                            accY = accY - (repel*(mb/od)*(odY/od));
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

            if(friction>0){
                console.log("friction: " + String(friction));
            }
            if (Math.abs(vel) < friction || vel==0)
            {
                var fricvel = 0;
            }
            else
            {
                var fricvel = vel - friction*(vel/Math.abs(vel));
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

        var mass = parseInt(thingA.getAttribute("mass"));

        thingA.setAttribute("x", commands[i][1]);
        thingA.setAttribute("y", commands[i][2]);

        thingA.setAttribute("velx", commands[i][3]);
        thingA.setAttribute("vely", commands[i][4]);

        thingA.children[0].style.fontSize = String(Math.ceil(scale*mass/5)) + "px";

        thingA.style.width = String(2*scale*mass)+"px";
        thingA.style.height = String(2*scale*mass)+"px";

        thingA.style.left = String(panx + scale*commands[i][1] - scale*mass) + "px";
        thingA.style.top = String(pany + scale*commands[i][2] - scale*mass) + "px";
        thingA.style.borderRadius = String(scale*mass*2) + "px";
    }
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
}

window.addEventListener("wheel", function(e) {
    var body = document.getElementsByTagName("BODY")[0];
    var graph = document.getElementById("graph");
    var x = parseInt(body.getAttribute("x"));
    var y = parseInt(body.getAttribute("y"));
    var panx = parseFloat(graph.getAttribute("panx"));
    var pany = parseFloat(graph.getAttribute("pany"));

    var dir = Math.sign(e.deltaY);
    var scale = parseFloat(graph.getAttribute("scale"));
    if(dir == -1)
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
});
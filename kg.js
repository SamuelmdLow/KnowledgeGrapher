window.setInterval(update, 100);

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

            var attracts = [];
            for(let x=0;x<thing.relations.length; x++)
            {
                attracts.push(thing.relations[x][1]);
            }
            circle.setAttribute("relations", attracts.join(","))

            circle.setAttribute("mass", thing.mass);

            const name = document.createElement("p");
            name.innerHTML = thing.name;
            name.classList.add("vertical-center");

            circle.appendChild(name);
            graph.appendChild(circle);
        }
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
        thingA.style.width = String(2*10*scale*parseInt(thingA.getAttribute("mass")))+"px";
        thingA.style.height = String(2*10*scale*parseInt(thingA.getAttribute("mass")))+"px";
    }
}

function physics()
{
    var graph = document.getElementById("graph");
    var children = graph.children;
    var friction = parseFloat(graph.getAttribute("friction"));
    var repel = parseInt(graph.getAttribute("repel"));
    var attract = parseInt(graph.getAttribute("attract"));

    var scale = parseFloat(graph.getAttribute("scale"));
    var panx = parseInt(graph.getAttribute("panx"));
    var pany = parseInt(graph.getAttribute("pany"));

    var commands = []

    for(let a=0; a<children.length; a++)
    {
        var thingA = children[a];
        var x = parseInt(thingA.getAttribute("x"));
        var y = parseInt(thingA.getAttribute("y"));
        var accX = 0;
        var accY = 0;
        var colX = 0;
        var colY = 0;
        var m = parseInt(thingA.getAttribute("mass"));

        var attracts = thingA.getAttribute("relations").split(",");

        for(let b=0; b<children.length; b++)
        {
            if (a != b)
            {
                var thingB = children[b];

                var dX = parseInt(thingB.getAttribute("x")) - x;
                var dY = parseInt(thingB.getAttribute("y")) - y;
                var d = Math.sqrt((dX * dX) + (dY * dY));

                d = d - (parseInt(thingA.getAttribute("mass")) + parseInt(thingB.getAttribute("mass")));

                if (0>= d)
                {
                    var bvx = parseInt(thingB.getAttribute("velx"));
                    var bvy = parseInt(thingB.getAttribute("vely"));
                    var bv = Math.sqrt((bvx*bvx) + (bvy*bvy));

                    if(bv < 1)
                    {
                        bv = 1;
                    }

                    var momentum = parseInt(thingB.getAttribute("mass")) * bv;

                    if (Math.sqrt((dX * dX) + (dY * dY))==0)
                    {
                        accX = accX - momentum*2*(Math.round(Math.random()) -0.5);
                        accY = accY - momentum*2*(Math.round(Math.random()) -0.5);
                    }
                    else
                    {
                        if(dX!=0)
                        {
                            accX = accX - momentum * d/dX;
                        }
                        else
                        {
                            accX = accX - momentum * d;
                        }

                        if(dY!=0)
                        {
                            accY = accY - momentum * d/dY;
                        }
                        else
                        {
                            accY = accY - momentum * d;
                        }
                    }
                }
                else
                {
                    accX = accX - repel*(m/d)*(dX/d);
                    accY = accY - repel*(m/d)*(dY/d);
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

                if (dX != 0)
                {
                    var accX = accX + count*(attract*dX);
                }

                if (dY != 0)
                {
                    var accY = accY + count*(attract*dY);
                }
            }
        }

        var velx = parseInt(thingA.getAttribute("velx")) + accX;
        var vely = parseInt(thingA.getAttribute("vely")) + accY;

        var vel = Math.sqrt((velx*velx) + (vely*vely));

        if(vel>10)
        {
            vel = 10;
        }

        if (Math.abs(vel) < friction)
        {
            var fricvel = 0;
        }
        else
        {
            var fricvel = vel - friction*(vel/Math.abs(vel));
        }

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

    for (let i=0; i<commands.length; i++)
    {
        thingA = commands[i][0]

        thingA.setAttribute("x", commands[i][1]);
        thingA.setAttribute("y", commands[i][2]);

        thingA.setAttribute("velx", commands[i][3]);
        thingA.setAttribute("vely", commands[i][4]);

        thingA.style.left = String(panx + scale*commands[i][1] - scale*10*parseInt(thingA.getAttribute("mass"))) + "px";
        thingA.style.top = String(pany + scale*commands[i][2] - scale*10*parseInt(thingA.getAttribute("mass"))) + "px";
    }
}
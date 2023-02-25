from flask import Response, Flask, flash, session, render_template, redirect, url_for, request, send_from_directory, jsonify
from pathlib import Path
import os

app = Flask(__name__)

@app.route('/')
def index():
    graphs = Path("user").glob('**/*')
    ids = []
    for graph in graphs:
        ids.append(graph.name.replace(".txt", ""))

    return render_template('index.html', graphs=ids)

@app.route('/edit/<id>')
def edit(id):

    if not os.path.exists("user/"+id+".txt"):
        return "oops"
    else:
        file = open("user/"+id+".txt", "r").read()
        return render_template('kg.html', file=file, id=id)

@app.route('/view/<id>')
def view(id):

    if not os.path.exists("user/"+id+".txt"):
        return "oops"
    else:
        file = open("user/"+id+".txt", "r").read()
        return render_template('vkg.html', file=file, id=id)

@app.route('/new')
def new():
    import secrets
    id = secrets.token_urlsafe(5)
    print(id)
    for i in range(15):
        if os.path.exists("/user/"+id+".txt"):
            id = secrets.token_urlsafe(5)
            if i == 14:
                return "oops"
        else:
            break
    file = open("user/" + id+".txt", "w")
    file.write('''
crewmate{
name:crewmate
image:null
desc:a player in among us
x:2.949438188901733
y:-4.648693871470461
is in -> amongus
}
imposter{
name:imposter
image:null
desc:player that secretly attempts to kill and sabotage the rest of the crewmates
x:4.472771999556363
y:-0.5085616229095441
is in -> amongus
is a -> crewmate
}
amongus{
name:among us
image:null
desc:an cartoonish astronaut themed social deducation video game
x:-0.7714916248073115
y:1.8015276353552727
}

    ''')
    file.close()
    return redirect('/edit/'+id)

@app.route('/save', methods=['GET', 'POST'])
def save():
    graphid = request.form.get("id")
    data = request.form.get("data")
    print("stuff")
    print(graphid)
    print(data)
    file = open("user/" + graphid+".txt", "w")
    file.write(data)
    file.close()
    return jsonify(status="success")

if __name__ == "__main__":
    app.run(debug=True)
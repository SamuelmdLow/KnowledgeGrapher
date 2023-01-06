from flask import Response, Flask, flash, session, render_template, redirect, url_for, request, send_from_directory, jsonify
from pathlib import Path
import os

app = Flask(__name__)

@app.route('/')
def index():
    graphs = Path("user").glob('**/*')

    return render_template('index.html', graphs=graphs)

@app.route('/edit/<id>')
def graph(id):
    print("id is " + id)
    if os.path.exists("/user/"+id):
        return "oops"
    else:
        file = open("user/"+id, "r").read()
        return render_template('kg.html', file=file)

@app.route('/save', methods=['GET', 'POST'])
def save():
    graphid = request.form.get("id")
    data = request.form.get("data")
    print("stuff")
    print(graphid)
    print(data)
    file = open("user/" + graphid, "w")
    file.write(data)
    file.close()
    return jsonify(status="success")

if __name__ == "__main__":
    app.run(debug=True)
from flask import Response, Flask, flash, session, render_template, redirect, url_for, request, send_from_directory, jsonify
from pathlib import Path
import os
from db import Database

app = Flask(__name__)

db = Database()

@app.route('/')
def index():
    graphs = db.getGraphsByUser(0)

    return render_template('index.html', graphs=graphs)

@app.route('/edit/<id>')
def edit(id):

    file = db.getGraph(0, id)[5]

    return render_template('kg.html', file=file, id=id)

@app.route('/view/<id>')
def view(id):

    file = db.getGraph(0, id)[5]

    return render_template('vkg.html', file=file, id=id)

@app.route('/new')
def new():
    import secrets
    id = secrets.token_urlsafe(5)

    db.createGraph(0, id)

    return redirect('/edit/'+id)

@app.route('/save', methods=['GET', 'POST'])
def save():
    graphid = request.form.get("id")
    data = request.form.get("data")

    db.saveGraph(data, 0, graphid)

    return jsonify(status="success")

if __name__ == "__main__":
    app.run(debug=True)
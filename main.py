import flask
from flask import Response, Flask, flash, session, render_template, redirect, url_for, request, send_from_directory, jsonify
from pathlib import Path
import os
import flask_login
from db import Database

app = Flask(__name__)
app.secret_key = b'temp'  # not real

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

users = {'foobar': {'password': 'secret'}}

db = Database()

class User(flask_login.UserMixin):
    pass


@login_manager.user_loader
def user_loader(slug):
    if db.getUserId(slug) is None:
        return

    user = User()
    user.id = slug
    return user


@login_manager.request_loader
def request_loader(request):
    slug = request.form.get('username')
    if db.getUserId(slug) is None:
        return

    user = User()
    user.id = slug
    return user

@app.route('/login', methods=['GET', 'POST'])
def login():
    if flask.request.method == 'GET':
        return '''
               <form action='login' method='POST'>
                <input type='text' name='username' id='username' placeholder='username'/>
                <input type='password' name='password' id='password' placeholder='password'/>
                <input type='submit' name='submit'/>
               </form>
               '''

    slug = flask.request.form['username']
    password = flask.request.form['password']
    result = db.checkUserCredentials(slug, password)
    if result == "Success":
        user = User()
        user.id = slug
        flask_login.login_user(user)
        return '<script>document.location.href = document.referrer</script>'
    else:
        return result

@app.route('/register', methods=['GET', 'POST'])
def register():
    if flask.request.method == 'GET':
        return '''
               <form action='register' method='POST'>
                <input type='text' name='username' id='username' placeholder='username'/>
                <input type='text' name='email' id='email' placeholder='email'/>
                <input type='password' name='password' id='password' placeholder='password'/>
                <input type='submit' name='submit'/>
               </form>
               '''

    slug = flask.request.form['username']
    email = flask.request.form['email']
    password = flask.request.form['password']
    if db.getUserId(slug) == None:
        db.createUser(slug, email, password)

        user = User()
        user.id = slug
        flask_login.login_user(user)
        return redirect('/')

    return 'Username taken'

@app.route('/protected')
@flask_login.login_required
def protected():
    return 'Logged in as: ' + flask_login.current_user.id

@app.route('/logout')
def logout():
    flask_login.logout_user()
    return redirect('/')

@login_manager.unauthorized_handler
def unauthorized_handler():
    return 'Unauthorized', 401

@app.route('/')
def index():

    context = {}
    context["newest"] = db.getGraphsNewest()
    if flask_login.current_user.is_authenticated:
        context["user_recent"] = db.getGraphsByUser(flask_login.current_user.id)
    return render_template('index.html', context=context)

@app.route('/<userSlug>')
def userPage(userSlug):
    context = {}
    user = db.getUser(userSlug)
    if not user:
        return redirect('/404')

    context["user"] = user
    return render_template('userPage.html', context=context)

@app.route('/<ownerSlug>/<graphSlug>/edit')
@flask_login.login_required
def edit(ownerSlug, graphSlug):

    context = {}
    graph = db.getGraph(ownerSlug, graphSlug)
    if not graph:
        return redirect('/404')

    context["graph"] = graph

    return render_template('graph-edit.html', context=context)

@app.route('/<ownerSlug>/<graphSlug>')
def view(ownerSlug, graphSlug):

    context = {}

    graph = db.getGraph(ownerSlug, graphSlug)
    if not graph:
        return redirect('/404')

    context["graph"] = graph

    return render_template('vkg.html', context=context)

@app.route('/new')
@flask_login.login_required
def new():
    import secrets
    id = secrets.token_urlsafe(5)

    db.createGraph(flask_login.current_user.id, id)

    return redirect('/'+flask_login.current_user.id+'/'+id+"/edit")

@app.route('/<ownerSlug>/<graphSlug>/save', methods=['GET', 'POST'])
@flask_login.login_required
def save(ownerSlug, graphSlug):
    data = request.form.get("data")

    db.saveGraph(data, ownerSlug, graphSlug)
    return jsonify(status="success")

if __name__ == "__main__":
    app.run(debug=True)
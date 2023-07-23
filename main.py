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

class User(flask_login.UserMixin):
    pass


@login_manager.user_loader
def user_loader(slug):
    db = Database()
    if db.getUserId(slug) is None:
        return

    user = User()
    user.id = slug
    return user


@login_manager.request_loader
def request_loader(request):
    db = Database()
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
    db = Database()
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

    db = Database()
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
    db = Database()
    context = db.setupContext()
    context["newest"] = db.getGraphsNewest()
    if flask_login.current_user.is_authenticated:
        context["user_recent"] = db.getGraphsByUser(flask_login.current_user.id)
    return render_template('index.html', context=context)

@app.route('/admin')
@flask_login.login_required
def admin():
    db = Database()
    if db.userIsAdmin(flask_login.current_user.id):
        context = {}

        userCount = db.statsUserCount()
        graphCount = db.statsGraphCount()
        graphPubCount = db.statsGraphCount(privacy=2)

        context["user_count"] = userCount
        context["graphsPerUser"] = graphCount/userCount
        context["graphsPubPerUser"] = graphPubCount/userCount

        context["graph_count"] = graphCount
        context["graph_public"] = graphPubCount
        context["graph_unlisted"] = db.statsGraphCount(privacy=1)
        context["graph_private"] = db.statsGraphCount(privacy=0)

        context["graph_recent_published"] = db.statsGraphRecents("published")
        context["graph_recent_edited"] = db.statsGraphRecents("edited")
        context["graph_recent_created"] = db.statsGraphRecents("created")

        context["user_recent_created"] = db.statsUserRecents()

        return render_template('admin-dashboard.html', context=context)
    return "Page not found", 404

@app.route('/admin/subjects')
@flask_login.login_required
def adminSubjects():
    db = Database()
    if db.userIsAdmin(flask_login.current_user.id):
        context = {}
        context["subjects"] = db.getSubjects()
        return render_template('admin-subject.html', context=context)
    return "Page not found", 404

@app.route('/admin/addSubject', methods=['GET', 'POST'])
@flask_login.login_required
def addSubject():
    if flask.request.method == 'GET':
        return '''
               <form action='addSubject' method='POST'>
                <input type='text' name='name' id='name' placeholder='name'/>
                <input type='submit' name='submit'/>
               </form>
               '''
    else:
        db = Database()
        print(flask.request.form['name'])
        if db.userIsAdmin(flask_login.current_user.id):
            db.addSubject(flask.request.form['name'])
            return '<script>document.location.href = document.referrer</script>'
        return "Page not found", 404

@app.route('/<userSlug>')
def userPage(userSlug):
    db = Database()
    context = db.setupContext()
    user = db.getUser(userSlug)
    if not user:
        return "Page not found", 404

    context["user"] = user
    context["graphs"] = db.getGraphsByUser(userSlug, privacy=2)
    return render_template('userPage.html', context=context)

@app.route('/<userSlug>/dir')
@flask_login.login_required
def userDir(userSlug):
    db = Database()
    context = db.setupContext()
    user = db.getUser(userSlug)
    if not user:
        return "Page not found", 404

    if flask_login.current_user.id == userSlug:
        context["user"] = user
        context["graphs"] = db.getGraphsByUser(userSlug)
        return render_template('userDir.html', context=context)
    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/edit')
@flask_login.login_required
def edit(ownerSlug, graphSlug):
    if flask_login.current_user.id == ownerSlug:
        db = Database()
        context = db.setupContext()
        graph = db.getGraph(ownerSlug, graphSlug)
        if not graph:
            return "Page not found", 404

        context["graph"] = graph

        return render_template('graph-edit.html', context=context)
    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>')
def view(ownerSlug, graphSlug):
    db = Database()
    context = db.setupContext()

    graph = db.getGraph(ownerSlug, graphSlug)

    if not graph:
        return redirect('/404')
    context["graph"] = graph

    context["liked"] = db.userLiked(flask_login.current_user.id, ownerSlug, graphSlug)

    if graph.privacy == 2 or graph.privacy == 1:
        return render_template('graph-view.html', context=context)
    elif graph.user == flask_login.current_user.id:
        return render_template('graph-view.html', context=context)

    return "Page not found", 404

@app.route('/new')
@flask_login.login_required
def new():
    import secrets
    id = secrets.token_urlsafe(5)
    db = Database()
    db.createGraph(flask_login.current_user.id, id)

    return redirect('/'+flask_login.current_user.id+'/'+id+"/edit")

@app.route('/<ownerSlug>/<graphSlug>/like', methods=['GET', 'POST'])
@flask_login.login_required
def like(ownerSlug, graphSlug):
    if flask_login.current_user.id == ownerSlug:
        db = Database()
        state = db.toggleLike(flask_login.current_user.id, ownerSlug, graphSlug)
        return state

    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/save', methods=['GET', 'POST'])
@flask_login.login_required
def save(ownerSlug, graphSlug):
    if flask_login.current_user.id == ownerSlug:
        db = Database()
        data = request.form.get("data")
        db.saveGraph(data, ownerSlug, graphSlug)
        return jsonify(status="success")

    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/saveInfo', methods=['GET', 'POST'])
@flask_login.login_required
def saveInfo(ownerSlug, graphSlug):
    if flask.request.method == 'GET':
        return '''
               <form action='saveInfo' method='POST'>
                <input type='text' name='name' id='name' placeholder='name'/>
                 <select name="privacy" id="privacy">
                    <option value="0">Private</option>
                    <option value="1">Unlisted</option>
                    <option value="2">Public</option>
                </select>
                <input type='text' name='desc' id='desc' placeholder='desc'/>
                <input type='submit' name='submit'/>
               </form>
               '''
    elif flask_login.current_user.id == ownerSlug:
        db = Database()
        name = request.form.get("name")
        privacy = request.form.get("privacy")
        desc = request.form.get("desc")
        db.saveGraphInfo(ownerSlug, graphSlug, name, privacy, desc)
        return '<script>document.location.href = document.referrer</script>'

    return "Page not found", 404

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == "__main__":
    app.run(debug=True)
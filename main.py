import io

import flask
from flask import Response, Flask, flash, session, render_template, redirect, url_for, request, send_from_directory, jsonify
import flask_login
from db import Database
import os

app = Flask(__name__)

secretKey = b'secret'
if "SECRET_KEY" in os.environ:
    secretKey = bytes(os.environ["SECRET_KEY"], 'utf-8')

app.secret_key = secretKey

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

users = {'foobar': {'password': 'secret'}}

class User(flask_login.UserMixin):
    def __init__(self):
        self.name = "Name missing"


@login_manager.user_loader
def user_loader(slug):
    print("user loader")
    db = Database()
    print("got db")
    if db.getUserId(slug) is None:
        return

    user = User()
    user.id = slug
    user.name = db.getUser(slug).name
    return user


@login_manager.request_loader
def request_loader(request):
    print("request loader")
    db = Database()
    print("got db")
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
    slug = flask.request.form['username'].lower()
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
        return render_template('register.html')

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
    print("index")
    db = Database()
    print("got database")
    context = db.setupContext()
    context["popular"] = db.getGraphsPopular()
    context["newest"] = db.getGraphs(orderby="newest")
    if flask_login.current_user.is_authenticated:
        context["user"] = db.getUser(flask_login.current_user.id)
        context["user_recent"] = db.getGraphsByUser(flask_login.current_user.id, num=6)
        context["user_viewed"] = db.getGraphsViewedByUser(flask_login.current_user.id, num=6)
        context["activity"] = db.getActivity(flask_login.current_user.id)
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

        context["all_users"] = db.getAllUsers()
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
    userSlug = userSlug.lower()
    db = Database()
    context = db.setupContext()
    user = db.getUser(userSlug)
    if not user:
        return "Page not found", 404

    context["user"] = user

    tab = request.args.get("tab", None)

    if tab == "graphs":
        context["graphs"] = db.getGraphsByUser(userSlug, privacy=2)
        context["title"] = "All Graphs"
        return render_template('userDir.html', context=context)

    elif tab == "likes":
        context["graphs"] = db.getUserLikes(userSlug)
        context["title"] = "All Likes"
        return render_template('userDir.html', context=context)

    else:
        context["graphs"] = db.getGraphsByUser(userSlug, privacy=2)[:5]
        context["likes"] = db.getUserLikes(userSlug)[:5]

        if tab == "followers":
            context["followers"] = db.getFollowers(userSlug)
            context["followCount"] = len(context["followers"])
        else:
            context["followCount"] = len(db.getFollowers(userSlug))

        if tab == "following":
            context["following"] = db.getFollowing(userSlug)
            context["followingCount"] = len(context["following"])
        else:
            context["followingCount"] = len(db.getFollowing(userSlug))

        if flask_login.current_user.is_authenticated:
            context["isFollowing"] = db.checkFollowing(flask_login.current_user.id, userSlug)
        else:
            context["isFollowing"] = False

        return render_template('userPage.html', context=context)

@app.route('/<userSlug>/dir')
@flask_login.login_required
def userDir(userSlug):
    userSlug = userSlug.lower()
    db = Database()
    context = db.setupContext()
    user = db.getUser(userSlug)
    if not user:
        return "Page not found", 404

    if flask_login.current_user.id == userSlug:
        context["user"] = user
        context["graphs"] = db.getGraphsByUser(userSlug)
        context["title"] = "Directory"
        return render_template('userDir.html', context=context, edit=True)
    return "Page not found", 404

@app.route('/bookmarks')
@flask_login.login_required
def bookmarks():
    db = Database()
    context = db.setupContext()
    user = db.getUser(flask_login.current_user.id)
    if not user:
        return "Page not found", 404

    context["user"] = user
    context["graphs"] = db.getUserBookmarks(user.slug)
    context["title"] = "Bookmarks"
    return render_template('userDir.html', context=context)


@app.route('/<ownerSlug>/<graphSlug>/edit')
@flask_login.login_required
def edit(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
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
    ownerSlug = ownerSlug.lower()
    db = Database()
    context = db.setupContext()

    graph = db.getGraph(ownerSlug, graphSlug)

    if not graph:
        return redirect('/404')
    context["graph"] = graph

    if flask_login.current_user.is_authenticated:
        context["liked"] = db.userLiked(flask_login.current_user.id, ownerSlug, graphSlug)
        context["bookmarked"] = db.userBookmarked(flask_login.current_user.id, ownerSlug, graphSlug)
        db.viewGraph(flask_login.current_user.id, ownerSlug, graphSlug)
    else:
        context["liked"] = False

    if graph.privacy == 2 or graph.privacy == 1:
        return render_template('graph-view.html', context=context)
    elif graph.user == flask_login.current_user.id:
        return render_template('graph-view.html', context=context)

    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/quiz')
def quiz(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
    db = Database()
    context = db.setupContext()

    graph = db.getGraph(ownerSlug, graphSlug)

    if not graph:
        return redirect('/404')
    context["graph"] = graph

    if flask_login.current_user.is_authenticated:
        context["liked"] = db.userLiked(flask_login.current_user.id, ownerSlug, graphSlug)
        context["bookmarked"] = db.userBookmarked(flask_login.current_user.id, ownerSlug, graphSlug)
        db.viewGraph(flask_login.current_user.id, ownerSlug, graphSlug)
    else:
        context["liked"] = False

    if graph.privacy == 2 or graph.privacy == 1:
        return render_template('graph-quiz.html', context=context)
    elif graph.user == flask_login.current_user.id:
        return render_template('graph-quiz.html', context=context)

    return "Page not found", 404


@app.route('/new')
@flask_login.login_required
def new():
    import secrets
    id = secrets.token_urlsafe(5)
    db = Database()
    db.createGraph(flask_login.current_user.id, id)

    return redirect('/'+flask_login.current_user.id+'/'+id+"/edit")

@app.route('/follow', methods=['GET', 'POST'])
@flask_login.login_required
def follow():
    db = Database()
    userSlug = request.form.get("user")
    db.toggleFollow(flask_login.current_user.id, userSlug)
    return '<script>document.location.href = document.referrer</script>'

@app.route('/<ownerSlug>/<graphSlug>/like', methods=['GET', 'POST'])
@flask_login.login_required
def like(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
    db = Database()
    state = db.toggleLike(flask_login.current_user.id, ownerSlug, graphSlug)
    return state

@app.route('/<ownerSlug>/<graphSlug>/bookmark', methods=['GET', 'POST'])
@flask_login.login_required
def bookmark(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
    db = Database()
    state = db.toggleBookmark(flask_login.current_user.id, ownerSlug, graphSlug)
    return state

@app.route('/<ownerSlug>/<graphSlug>/save', methods=['GET', 'POST'])
@flask_login.login_required
def save(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
    if flask_login.current_user.id == ownerSlug:
        db = Database()
        data = request.form.get("data")
        db.saveGraph(data, ownerSlug, graphSlug)
        return jsonify(status="success")

    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/delete', methods=['GET', 'POST'])
@flask_login.login_required
def delete(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
    if flask_login.current_user.id == ownerSlug:
        db = Database()
        db.deleteGraph(ownerSlug, graphSlug)
        return jsonify(status="success")

    return "Page not found", 404

@app.route('/<ownerSlug>/<graphSlug>/saveInfo', methods=['GET', 'POST'])
@flask_login.login_required
def saveInfo(ownerSlug, graphSlug):
    ownerSlug = ownerSlug.lower()
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
        from requests import post
        db = Database()
        from html_sanitizer import Sanitizer
        sanitizer = Sanitizer()
        name = sanitizer.sanitize(request.form.get("name"))
        privacy = request.form.get("privacy")
        desc = request.form.get("desc")
        wordcloud = request.form.get("wordcloud")
        db.saveGraphInfo(ownerSlug, graphSlug, name, privacy, desc)

        resp = post('https://quickchart.io/wordcloud', json={
            'format': 'png',
            'width': 300,
            'height': 200,
            'fontScale': 10,
            'scale': 'linear',
            'useWordList': True,
            'cleanWords': False,
            'removeStopwords': False,
            'rotation': '0',
            'minWordLength': 4,
            'case': 'none',
            'text': wordcloud,
            'colors': ["#420F69", "#9A22F5", "#6918A9", "#7219B5", "#5A148F"],
        })

        if "AWS_S3" in os.environ:
            import boto3
            s3 = boto3.client('s3',
              aws_access_key_id=os.environ["AWS_S3_ID"],
              aws_secret_access_key=os.environ["AWS_S3_KEY"])

            s3.upload_fileobj(io.BytesIO(resp.content), os.environ["AWS_S3"], 'tn-' + str(ownerSlug) + '-' + str(graphSlug) + ".png")
        else:
            with open('static/images/thumbnails/' + str(ownerSlug) + '-' + str(graphSlug) + '.png', 'wb') as f:
                f.write(resp.content)

        return '<script>document.location.href = document.referrer</script>'

    return "Page not found", 404

@app.context_processor
def inject_user():
    d = {}
    if "AWS_S3" in os.environ:
        d["imagesUrl"] = os.environ["IMAGES_URL"]
    return d

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == "__main__":
    print("run app")
    app.run(debug=True, host="0.0.0.0")

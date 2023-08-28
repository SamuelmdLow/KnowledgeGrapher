import datetime

import mysql.connector
import bcrypt

class Database:

    def __init__(self):
        import os

        host = "localhost"
        if "DATABASE_HOST" in os.environ:
            host = os.environ["DATABASE_HOST"]

        password = "root"
        if "DATABASE_PASSWORD" in os.environ:
            password = os.environ["DATABASE_PASSWORD"]

        sql = mysql.connector.connect(
            host=host,
            user="root",
            password=password
        )
        mycursor = sql.cursor()
        mycursor.execute("SHOW DATABASES")

        print(mycursor)
        if ('mydatabase',) not in mycursor:
            sql.cursor().execute("CREATE DATABASE mydatabase")
            self.mydb = mysql.connector.connect(
                host=host,
                user="root",
                password=password,
                database="mydatabase"
            )
            self.cursor = self.mydb.cursor()

            self.createTables()
        else:
            self.mydb = mysql.connector.connect(
                host=host,
                user="root",
                password=password,
                database="mydatabase"
            )
            self.cursor = self.mydb.cursor()

    class Graph:
        def __init__(self, data):
            self.id = data[0]
            self.userId = data[1]
            self.user = data[1]
            self.slug = data[2]
            self.name = data[3]
            self.desc = data[4]
            self.subject = data[5]
            self.nodes = data[6]
            self.privacy = data[7]
            self.likes = data[8]
            self.creationDate = data[9]
            self.pubDate = data[10]
            self.lastEdit = data[11]

    class User:
        def __init__(self, data):
            self.slug = data[1]
            self.email = data[2]
            self.name = data[3]
            self.bio = data[4]
            self.creationDate = data[5]
            self.rssCode = data[7]

    class Subject:
        def __init__(self, data):
            self.name = data[0]

    def createGraphObj(self, data):
        graph = self.Graph(data)
        graph.user = self.getUserSlug(data[1])
        return graph

    def createTables(self):
        self.cursor.execute('''
            CREATE TABLE users (
                id int NOT NULL AUTO_INCREMENT,
                slug VARCHAR(35),
                email VARCHAR(255),
                name VARCHAR(35),
                bio VARCHAR(255),
                creationdate DATETIME,
                passhash VARCHAR(255),
                rssCode VARCHAR(40),
                admin int DEFAULT 0,
                PRIMARY KEY (id),
                UNIQUE (email),
                UNIQUE (slug)
            )''')

        self.cursor.execute('''
            CREATE TABLE subjects (
                id int NOT NULL AUTO_INCREMENT,
                name VARCHAR(45),
                PRIMARY KEY (id),
                UNIQUE (name)
            )''')

        self.cursor.execute('''
            CREATE TABLE graphs (
                id int NOT NULL AUTO_INCREMENT,
                user int,
                slug VARCHAR(35),
                name VARCHAR(45),
                description VARCHAR(500),
                subject int,
                nodes LONGTEXT,
                privacy int,
                likes int DEFAULT 0,
                creationdate DATETIME,
                pubdate DATETIME,
                lastedit DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY (user) REFERENCES users(id),
                FOREIGN KEY (subject) REFERENCES subjects(id),
                UNIQUE (user, slug)
            )''')

        self.cursor.execute('''
            CREATE TABLE likes (
                user int,
                graph int,
                date DATETIME,
                FOREIGN KEY (user) REFERENCES users(id),
                FOREIGN KEY (graph) REFERENCES graphs(id)
            )''')

        self.cursor.execute('''
            CREATE TABLE bookmarks (
                user int,
                graph int,
                date DATETIME,
                FOREIGN KEY (user) REFERENCES users(id),
                FOREIGN KEY (graph) REFERENCES graphs(id)
            )''')

        self.cursor.execute('''
            CREATE TABLE views (
                user int,
                graph int,
                date DATETIME,
                FOREIGN KEY (user) REFERENCES users(id),
                FOREIGN KEY (graph) REFERENCES graphs(id)
            )''')

        self.cursor.execute('''
            CREATE TABLE following (
                follower int,
                followed int,
                date DATETIME,
                FOREIGN KEY (follower) REFERENCES users(id),
                FOREIGN KEY (followed) REFERENCES users(id)
            )''')

        self.cursor.execute('''
            CREATE TABLE activity (
                user int,
                img VARCHAR(100),
                text VARCHAR(500),
                date DATETIME,
                FOREIGN KEY (user) REFERENCES users(id)
            )''')

    def createGraph(self, userSlug, graphSlug, privacy=0):
        defaultGraph = '''
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
            }'''

        userId = self.getUserId(userSlug)
        if userId is None:
            print("fail point")
            return False
        else:
            print("epic?")

        sql = "INSERT INTO graphs (user, slug, name, privacy, nodes, creationdate, lastedit) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        val = (userId, graphSlug, "Untitled", privacy, defaultGraph, datetime.datetime.now(), datetime.datetime.now())
        self.cursor.execute(sql, val)

        self.mydb.commit()

    def createUser(self, slug, email, password):
        passhash = bcrypt.hashpw(password.encode('ASCII'), bcrypt.gensalt())

        print(passhash)

        sql = "INSERT INTO users (slug, email, name, bio, creationdate, passhash) VALUES (%s, %s, %s, %s, %s, %s)"
        val = (slug, email, slug, "", datetime.datetime.now(), passhash)

        self.cursor.execute(sql, val)

        self.mydb.commit()

    def checkUserCredentials(self, slug, password):
        userId = self.getUserId(slug)
        if userId is None:
            return "Wrong username"
        sql = "SELECT passhash FROM users WHERE id =%s"
        val = (userId,)
        self.cursor.execute(sql, val)
        passhash = self.cursor.fetchone()[0]
        if bcrypt.checkpw(password.encode('ASCII'), passhash.encode('ASCII')):
            return "Success"
        else:
            return "Wrong password"

    def userIsAdmin(self, slug):
        userId = self.getUserId(slug)
        if userId is None:
            return "Wrong username"
        sql = "SELECT admin FROM users WHERE id =%s"
        val = (userId,)
        self.cursor.execute(sql, val)
        result = self.cursor.fetchone()[0]
        if result == 1:
            return True
        else:
            return False

    def getUserId(self, slug):
        sql = "SELECT id FROM users WHERE slug =%s"
        values = (slug,)
        self.cursor.execute(sql, values)
        result = self.cursor.fetchone()
        if result is None:
            return result
        else:
            return result[0]

    def getUser(self, slug):
        sql = "SELECT * FROM users WHERE slug =%s"
        values = (slug,)
        self.cursor.execute(sql, values)
        result = self.cursor.fetchone()
        if result is None:
            return False
        else:
            return self.User(result)

    def getUserSlug(self, id):
        sql = "SELECT slug FROM users WHERE id =%s"
        values = (id,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            return result
        else:
            return result[0]

    def getGraphsByUser(self, userSlug, privacy=None, num=None):
        userId = self.getUserId(userSlug)

        if userId is None:
            return []
        else:
            if privacy == None:
                sql = "SELECT * FROM graphs WHERE user =%s ORDER BY lastedit DESC"
                values = (userId,)
                self.cursor.execute(sql, values)
            else:
                sql = "SELECT * FROM graphs WHERE user =%s AND privacy =%s ORDER BY pubdate DESC"
                values = (userId, privacy)
                self.cursor.execute(sql, values)

            result = self.cursor.fetchall()

            if num != None:
                result = result[:num]

            for i in range(len(result)):
                result[i] = self.createGraphObj(result[i])

            return result

    def getGraphsViewedByUser(self, userSlug, num=7):
        userId = self.getUserId(userSlug)

        if userId is None:
            return []
        else:
            sql = "SELECT graph FROM views WHERE user =%s ORDER BY date DESC"
            val = (userId,)

            self.cursor.execute(sql, val)
            result = self.cursor.fetchall()[:num]

            for i in range(len(result)):
                result[i] = self.getGraphById(result[i][0])

            return result

    def getGraphById(self, id):
        sql = "SELECT * FROM graphs WHERE id =%s"
        val = (id,)
        self.cursor.execute(sql, val)
        result = self.cursor.fetchone()

        if result is None:
            return None
        else:
            return self.createGraphObj(result)


    def getGraphs(self, orderby="newest", num=15):
        if orderby == "likes":
            sql = "SELECT * FROM graphs WHERE privacy =%s ORDER BY likes DESC"
        else:
            sql = "SELECT * FROM graphs WHERE privacy =%s ORDER BY pubdate DESC"
        values = (2,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()[:num]

        for i in range(len(result)):
            result[i] = self.createGraphObj(result[i])

        return result

    def getGraphsPopular(self):
        sql = "SELECT * FROM graphs WHERE privacy = 2 ORDER BY likes DESC"
        self.cursor.execute(sql)

        result = []

        graphs = self.cursor.fetchall()

        for graph in graphs:
            sql = "SELECT date FROM likes WHERE graph=%s"
            val = (graph[0],)
            self.cursor.execute(sql, val)

            dates = self.cursor.fetchall()
            score = 0

            for date in dates:
                delta = datetime.datetime.now() - date[0]
                score = score + pow(0.99, pow(delta.days, 2))

            if len(result) > 15:
                if result[14][1] < score:
                    result.append((graph, score))
                    result.sort(key=sortKey, reverse=True)
                elif result[14][1] > graph[8]:
                    break
            else:
                result.append((graph, score))
                result.sort(key=sortKey, reverse=True)

        for i in range(len(result)):
            result[i] = self.createGraphObj(result[i][0])

        return result

    def getGraph(self, userSlug, graphSlug):
        userId = self.getUserId(userSlug)
        sql = "SELECT * FROM graphs WHERE user =%s AND slug = %s"
        values = (userId, graphSlug)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            return False
        else:
            return self.createGraphObj(result)

    def saveGraph(self, nodes, userSlug, slug):
        userId = self.getUserId(userSlug)
        sql = "UPDATE graphs SET nodes = %s, lastedit = %s WHERE user =%s AND slug = %s"
        values = (nodes, datetime.datetime.now(), userId, slug)
        self.cursor.execute(sql, values)
        self.mydb.commit()
    def saveGraphInfo(self, userSlug, slug, name, privacy, desc):
        graph = self.getGraph(userSlug, slug)
        userId = self.getUserId(userSlug)
        if graph.privacy != 2 and int(privacy) == 2:
            sql = "UPDATE graphs SET lastedit = %s, pubdate = %s, name = %s, privacy = %s, description = %s WHERE user =%s AND slug = %s"
            values = (datetime.datetime.now(), datetime.datetime.now(), name, int(privacy), desc, userId, slug)

            userUser = self.getUser(userSlug)

            text = "🆕 " + "<a href='/" + userUser.slug + "'>" + userUser.name + "</a>" + ' published "'  + "<a href='/" + userUser.slug + "/" + slug + "'>" + name + '"</a>'
            self.publishActivity(userSlug, text)
        else:
            sql = "UPDATE graphs SET lastedit = %s, name = %s, privacy = %s, description = %s WHERE user =%s AND slug = %s"
            values = (datetime.datetime.now(), name, int(privacy), desc, userId, slug)
        self.cursor.execute(sql, values)
        self.mydb.commit()

    def viewGraph(self, userSlug, ownerSlug, graphSlug):
        userId = self.getUserId(userSlug)
        graph = self.getGraph(ownerSlug, graphSlug)

        sql = "SELECT * FROM views WHERE user =%s AND graph = %s"
        values = (userId, graph.id)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            sql = "INSERT INTO views (user, graph, date) VALUES (%s, %s, %s)"
            val = (userId, graph.id, datetime.datetime.now())

            self.cursor.execute(sql, val)
            self.mydb.commit()

            return "first view"
        else:
            sql = "UPDATE views SET date = %s WHERE user = %s AND graph = %s"
            val = (datetime.datetime.now(), userId, graph.id)

            self.cursor.execute(sql, val)
            self.mydb.commit()

            return "view again"

    def toggleLike(self, userSlug, ownerSlug, graphSlug):
        userId = self.getUserId(userSlug)
        graph = self.getGraph(ownerSlug, graphSlug)

        sql = "SELECT * FROM likes WHERE user =%s AND graph = %s"
        values = (userId, graph.id)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            sql = "INSERT INTO likes (user, graph, date) VALUES (%s, %s, %s)"
            val = (userId, graph.id, datetime.datetime.now())

            self.cursor.execute(sql, val)
            self.mydb.commit()

            self.recountLikes(graph)


            userUser = self.getUser(userSlug)
            ownerUser = self.getUser(ownerSlug)

            text = "💜 " + "<a href='/" + userUser.slug + "'>" + userUser.name + "</a>" + ' liked "'  + "<a href='/" + ownerUser.slug + "/" + graphSlug + "'>" + graph.name + '"</a>'
            self.publishActivity(userSlug, text)

            return "like"
        else:
            sql = "DELETE FROM likes WHERE user = %s AND graph = %s"
            val = (userId, graph.id)

            self.cursor.execute(sql, val)
            self.mydb.commit()

            self.recountLikes(graph)

            return "unlike"

    def recountLikes(self, graph):
        sql = "UPDATE graphs SET likes =%s WHERE id = %s"
        val = (self.likeCount(graph.id), graph.id)
        self.cursor.execute(sql, val)
        self.mydb.commit()

    def likeCount(self, graphId):
        sql = "SELECT COUNT(user) FROM likes WHERE graph=%s"
        val = (graphId,)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]
        return result

    def userLiked(self, userSlug, ownerSlug, graphSlug):
        userId = self.getUserId(userSlug)
        if userId is None:
            return False
        graph = self.getGraph(ownerSlug, graphSlug)

        sql = "SELECT COUNT(user) FROM likes WHERE user=%s AND graph=%s"
        val = (userId, graph.id)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]

        if result > 0:
            return True
        return False


    def getUserLikes(self, userSlug):
        userId = self.getUserId(userSlug)
        if userId is None:
            print("fail")
            return []

        sql = "SELECT graph FROM likes WHERE user=%s ORDER BY date DESC"
        val = (userId,)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchall()

        i = 0
        while i < len(result):
            result[i] = self.getGraphById(result[i][0])

            if result[i].privacy == 0:
                result.remove(i)
            else:
                i = i + 1

        return result

    def toggleBookmark(self, userSlug, ownerSlug, graphSlug):
        userId = self.getUserId(userSlug)
        graph = self.getGraph(ownerSlug, graphSlug)

        sql = "SELECT * FROM bookmarks WHERE user =%s AND graph = %s"
        values = (userId, graph.id)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            sql = "INSERT INTO bookmarks (user, graph, date) VALUES (%s, %s, %s)"
            val = (userId, graph.id, datetime.datetime.now())

            self.cursor.execute(sql, val)
            self.mydb.commit()

            return "bookmarked"
        else:
            sql = "DELETE FROM bookmarks WHERE user = %s AND graph = %s"
            val = (userId, graph.id)

            self.cursor.execute(sql, val)
            self.mydb.commit()

            return "unbookmarked"

    def userBookmarked(self, userSlug, ownerSlug, graphSlug):
        userId = self.getUserId(userSlug)
        if userId is None:
            return False
        graph = self.getGraph(ownerSlug, graphSlug)

        sql = "SELECT COUNT(user) FROM bookmarks WHERE user=%s AND graph=%s"
        val = (userId, graph.id)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]

        if result > 0:
            return True
        return False

    def getUserBookmarks(self, userSlug):
        userId = self.getUserId(userSlug)
        if userId is None:
            print("fail")
            return []

        sql = "SELECT graph FROM bookmarks WHERE user=%s ORDER BY date DESC"
        val = (userId,)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchall()

        print(result)
        i = 0
        while i < len(result):
            result[i] = self.getGraphById(result[i][0])

            if result[i].privacy == 0:
                result.remove(i)
            else:
                i = i + 1

        return result

    def toggleFollow(self, follower, followed):
        followerId = self.getUserId(follower)
        followedId = self.getUserId(followed)

        sql = "SELECT * FROM following WHERE follower =%s AND followed = %s"
        values = (followerId, followedId)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            sql = "INSERT INTO following (follower, followed, date) VALUES (%s, %s, %s)"
            val = (followerId, followedId, datetime.datetime.now())

            self.cursor.execute(sql, val)
            self.mydb.commit()

            followerUser = self.getUser(follower)
            followedUser = self.getUser(followed)

            text = "👥 " + "<a href='/" + followerUser.slug + "'>" + followerUser.name + "</a>" + " followed "  + "<a href='/" + followedUser.slug + "'>" + followedUser.name + "</a>"
            self.publishActivity(follower, text)

            return "follow"
        else:
            sql = "DELETE FROM following WHERE follower =%s AND followed = %s"
            val = (followerId, followedId)

            self.cursor.execute(sql, val)
            self.mydb.commit()

            return "unfollow"

    def checkFollowing(self, follower, followed):
        followerId = self.getUserId(follower)
        followedId = self.getUserId(followed)

        sql = "SELECT * FROM following WHERE follower =%s AND followed = %s"
        values = (followerId, followedId)
        self.cursor.execute(sql, values)
        result = self.cursor.fetchone()
        if result is None:
            return False
        return True

    def getFollowers(self, userSlug):
        userId = self.getUserId(userSlug)

        sql = "SELECT follower FROM following WHERE followed = %s ORDER By date DESC"
        values = (userId,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()

        for i in range(len(result)):
            result[i] = self.getUser(self.getUserSlug(result[i][0]))

        return result

    def getFollowing(self, userSlug):
        userId = self.getUserId(userSlug)

        sql = "SELECT followed FROM following WHERE follower = %s ORDER By date DESC"
        values = (userId,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()

        for i in range(len(result)):
            result[i] = self.getUser(self.getUserSlug(result[i][0]))

        return result

    def getSubjects(self):
        sql = "SELECT name FROM subjects ORDER BY name"
        self.cursor.execute(sql)

        result = self.cursor.fetchall()

        for i in range(len(result)):
            result[i] = self.Subject(result[i])
        return result

    def addSubject(self, name):
        sql = "INSERT INTO subjects (name) VALUES (%s) "
        val = (name,)

        self.cursor.execute(sql, val)
        self.mydb.commit()

    def setupContext(self):
        context = {}
        context["subjects"] = self.getSubjects()
        return context

    def statsGraphCount(self, privacy=None):
        if privacy == None:
            sql = "SELECT COUNT(id) FROM graphs"
            self.cursor.execute(sql)
        else:
            sql = "SELECT COUNT(id) FROM graphs WHERE privacy=%s"
            val = (privacy,)
            self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]

        return result

    def statsUserCount(self):
        sql = "SELECT COUNT(id) FROM users"
        self.cursor.execute(sql)
        result = self.cursor.fetchone()[0]

        return result

    def statsGraphRecents(self, type):
        day = datetime.timedelta(days=1)
        yesterday = datetime.datetime.now()-day

        if type == "published":
            sql = "SELECT COUNT(id) FROM graphs WHERE pubdate > %s"
        elif type == "edited":
            sql = "SELECT COUNT(id) FROM graphs WHERE lastedit > %s"
        else:
            sql = "SELECT COUNT(id) FROM graphs WHERE creationdate > %s"

        val = (yesterday,)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]

        return result

    def statsUserRecents(self):
        day = datetime.timedelta(days=1)
        yesterday = datetime.datetime.now()-day

        sql = "SELECT COUNT(id) FROM users WHERE creationdate > %s"
        val = (yesterday,)
        self.cursor.execute(sql, val)

        result = self.cursor.fetchone()[0]

        return result

    def publishActivity(self, userSlug, text, image=""):
        userId = self.getUserId(userSlug)

        sql = "SELECT follower FROM following WHERE followed = %s ORDER By date DESC"
        values = (userId,)
        self.cursor.execute(sql, values)

        followers = self.cursor.fetchall()

        for follower in followers:
            self.addActivity(follower[0], text, image)

    def addActivity(self, receiver, text, image):

        sql = "DELETE FROM activity WHERE user=%s AND text=%s"
        val = (receiver, text)
        self.cursor.execute(sql, val)

        sql = "SELECT COUNT(text) FROM activity WHERE user=%s"
        val = (receiver,)
        self.cursor.execute(sql, val)
        count = self.cursor.fetchone()[0]

        if count > 7:
            weekAgo = datetime.datetime.now() - datetime.timedelta(days=7)
            sql = "DELETE FROM activity WHERE date<%s"
            val = (weekAgo,)
            self.cursor.execute(sql, val)

        sql = "INSERT INTO activity (user, text, img, date) VALUES (%s, %s, %s, %s) "
        val = (receiver, text, image, datetime.datetime.now())

        self.cursor.execute(sql, val)
        self.mydb.commit()

    def getActivity(self, user):
        userId = self.getUserId(user)
        sql = "SELECT text, img FROM activity WHERE user =%s ORDER BY date DESC"
        val = (userId,)

        self.cursor.execute(sql, val)
        result = self.cursor.fetchall()

        return result

def sortKey(e):
    return e[1]

def remakeDatabase():
    sql = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root"
    )
    mycursor = sql.cursor()
    mycursor.execute("DROP DATABASE mydatabase")
    sql.cursor().execute("CREATE DATABASE mydatabase")
    Database().createTables()

if __name__ == "__main__":
    db = Database()
    db.createTables()

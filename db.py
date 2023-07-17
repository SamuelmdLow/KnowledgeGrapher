import datetime

import mysql.connector
import bcrypt

class Database:

    def __init__(self):
        sql = mysql.connector.connect(
            host="localhost",
            user="root",
            password="root"
        )
        mycursor = sql.cursor()
        mycursor.execute("SHOW DATABASES")

        print(mycursor)
        if ('mydatabase',) not in mycursor:
            sql.cursor().execute("CREATE DATABASE mydatabase")
            self.mydb = mysql.connector.connect(
                host="localhost",
                user="root",
                password="root",
                database="mydatabase"
            )
            self.cursor = self.mydb.cursor()

            self.createTables()
        else:
            self.mydb = mysql.connector.connect(
                host="localhost",
                user="root",
                password="root",
                database="mydatabase"
            )
            self.cursor = self.mydb.cursor()

    class Graph:
        def __init__(self, data):
            self.user = data[1]
            self.slug = data[2]
            self.name = data[3]
            self.desc = data[4]
            self.subject = data[5]
            self.nodes = data[6]
            self.privacy = data[7]
            self.creationDate = data[8]
            self.pubDate = data[9]
            self.lastEdit = data[10]

    class User:
        def __init__(self, data):
            self.slug = data[1]
            self.email = data[2]
            self.name = data[3]
            self.bio = data[4]
            self.creationDate = data[5]

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

    def getGraphsByUser(self, userSlug, privacy=None):
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

            for i in range(len(result)):
                result[i] = self.createGraphObj(result[i])

            return result

    def getGraphsNewest(self, num=15):
        sql = "SELECT * FROM graphs WHERE privacy =%s ORDER BY pubdate DESC"
        values = (2,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()[:num]

        for i in range(len(result)):
            result[i] = self.createGraphObj(result[i])

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
        else:
            sql = "UPDATE graphs SET lastedit = %s, name = %s, privacy = %s, description = %s WHERE user =%s AND slug = %s"
            values = (datetime.datetime.now(), name, int(privacy), desc, userId, slug)
        self.cursor.execute(sql, values)
        self.mydb.commit()

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
    remakeDatabase()

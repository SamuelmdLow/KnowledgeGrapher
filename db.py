import datetime

import mysql.connector

class Graph:
    def __init__(self, data):
        self.user = Database().getUserSlug(data[1])
        self.slug = data[2]
        self.name = data[3]
        self.nodes = data[4]
        self.privacy = data[5]
        self.creationDate = data[6]
        self.pubDate = data[7]
        self.lastEdit = data[8]

class User:
    def __init__(self, data):
        self.slug = data[1]
        self.email = data[2]
        self.name = data[3]
        self.bio = data[4]
        self.creationDate = data[5]


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
                PRIMARY KEY (id),
                UNIQUE (email),
                UNIQUE (slug)
            )''')

        self.cursor.execute('''
            CREATE TABLE graphs (
                id int NOT NULL AUTO_INCREMENT,
                user int,
                slug VARCHAR(35),
                name VARCHAR(45),
                nodes LONGTEXT,
                privacy int,
                creationdate DATETIME,
                pubdate DATETIME,
                lastedit DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY (user) REFERENCES users(id),
                UNIQUE (user, slug)
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
        passhash = str(hash(password))
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

        if passhash == str(hash(password)):
            return "Success"
        else:
            return "Wrong password"

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
            return User(result)

    def getUserSlug(self, id):
        sql = "SELECT slug FROM users WHERE id =%s"
        values = (id,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()
        if result is None:
            return result
        else:
            return result[0]

    def getGraphsByUser(self, userSlug):
        userId = self.getUserId(userSlug)

        if userId is None:
            return []
        else:

            sql = "SELECT * FROM graphs WHERE user =%s ORDER BY lastedit DESC"
            values = (userId,)
            self.cursor.execute(sql, values)

            result = self.cursor.fetchall()

            for i in range(len(result)):
                result[i] = Graph(result[i])

            return result

    def getGraphsNewest(self, num=15):
        sql = "SELECT * FROM graphs WHERE privacy =%s ORDER BY pubdate DESC"
        values = (2,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()[:num]

        for i in range(len(result)):
            result[i] = Graph(result[i])

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
            return Graph(result)

    def saveGraph(self, nodes, userSlug, slug):
        userId = self.getUserId(userSlug)
        sql = "UPDATE graphs SET nodes = %s, lastedit = %s WHERE user =%s AND slug = %s"
        values = (nodes, datetime.datetime.now(), userId, slug)

        self.cursor.execute(sql, values)
        self.mydb.commit()

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

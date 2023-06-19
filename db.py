import mysql.connector

class Graph:

    def __init__(self, data):
        self.user = Database().getUserSlug(data[1])
        self.slug = data[2]
        self.name = data[3]
        self.privacy = data[4]
        self.nodes = data[5]

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
                id int NOT NULL,
                slug VARCHAR(35),
                email VARCHAR(255),
                name VARCHAR(35),
                bio VARCHAR(255),
                PRIMARY KEY (id),
                UNIQUE (email),
                UNIQUE (slug)
            )''')

        self.cursor.execute('''
            CREATE TABLE graphs (
                id int NOT NULL,
                user int,
                slug VARCHAR(35),
                name VARCHAR(45),
                privacy int,
                nodes LONGTEXT,
                PRIMARY KEY (id),
                FOREIGN KEY (user) REFERENCES users(id),
                UNIQUE (user, slug)
            )''')

    def createGraph(self, user, slug, privacy=0):
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

        sql = "INSERT INTO graphs (user, slug, privacy, nodes) VALUES (%s, %s, %s, %s)"
        val = (user, slug, privacy, defaultGraph)
        self.cursor.execute(sql, val)

        self.mydb.commit()

    def getUserId(self, slug):
        sql = "SELECT id FROM users WHERE slug =%s"
        values = (slug,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()[0]
        return result

    def getUserSlug(self, id):
        sql = "SELECT slug FROM users WHERE id =%s"
        values = (id,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchone()[0]
        return result

    def getGraphsByUser(self, userSlug):
        userId = self.getUserId(userSlug)

        sql = "SELECT * FROM graphs WHERE user =%s"
        values = (userId,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()

        for i in range(len(result)):
            result[i] = Graph(result[i])

        return result

    def getGraphsNewest(self, num=15):
        sql = "SELECT * FROM graphs WHERE privacy =%s"
        values = (2,)
        self.cursor.execute(sql, values)

        result = self.cursor.fetchall()[:num]

        for i in range(len(result)):
            result[i] = Graph(result[i])

        return result

    def getGraph(self, userSlug, slug):
        userId = self.getUserId(userSlug)
        sql = "SELECT * FROM graphs WHERE user =%s AND slug = %s"
        values = (userId, slug)
        self.cursor.execute(sql, values)

        result = Graph(self.cursor.fetchone())

        return result

    def saveGraph(self, nodes, userSlug, slug):
        userId = self.getUserId(userSlug)
        sql = "UPDATE graphs SET nodes = %s WHERE user =%s AND slug = %s"
        values = (nodes, userId, slug)

        self.cursor.execute(sql, values)
        self.mydb.commit()

if __name__ == "__main__":
    db = Database()

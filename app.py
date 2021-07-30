# https://github.com/CoreyMSchafer/code_snippets/tree/master/Python/Flask_Blog
# https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login
import json
from flask import Flask, render_template, request, redirect, url_for, flash
from datetime import date
import pymysql
import pymysql.cursors
import hashlib

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'

user = ''


def connect():
    mysql = pymysql.connect(host='34.135.28.247',
                            user='flask',
                            password='rootpwd',
                            db='game',
                            charset='utf8mb4',
                            cursorclass=pymysql.cursors.DictCursor)
    return mysql


def create_db():
    mysql = connect()
    cur = mysql.cursor()
    users_create = '''CREATE TABLE IF NOT EXISTS `users` (
     `id` INTEGER PRIMARY KEY AUTO_INCREMENT,
     `email` varchar(100) NOT NULL UNIQUE ,
     `username` varchar(100) NOT NULL UNIQUE,
     `password` TEXT NOT NULL,
     `role` TEXT NOT NULL,
     `registrationDate` DATE NOT NULL,
     `status` varchar(100) DEFAULT "offline")'''
    cur.execute(users_create)

    scores_create = '''CREATE TABLE IF
     NOT EXISTS `scores` (`username` varchar(100) PRIMARY KEY ,
      `score` INTEGER )'''
    cur.execute(scores_create)
    mysql.commit()
    cur.close()


# APP

@app.route('/')
def login():
    create_db()
    return render_template('login.html')


@app.route('/register')
def register():
    return render_template('register.html')


@app.route('/play')
def play():
    flash('Hi ' + user + ' !', 'primary')
    return render_template('play.html')


@app.route('/logout')
def logout():
    update_status(user, "offline")
    flash('You have been logged out', 'primary')
    return redirect(url_for('login'))


@app.route('/register_post', methods=['POST'])
def register_post():
    mysql = connect()
    cur = mysql.cursor()
    ###### Admin Key ######
    valid_key = 'ABCD-1234'
    #######################
    email = request.form.get('email')
    username = request.form.get('username')
    password = request.form.get('password')
    role = request.form['role']
    registration_date = str(date.today())
    email_found = cur.execute('''SELECT `id` FROM `users` WHERE `email`=%s''', (email,))
    username_found = cur.execute('''SELECT `id` FROM `users` WHERE `username`=%s''', (username,))
    cur.close()
    if email_found:
        flash('An account with this email already exists.', 'danger')
        return redirect(url_for('register'))
    if username_found:
        flash('This username is taken, please choose another.', 'danger')
        return redirect(url_for('register'))
    if role == 'admin':
        admin_key = request.form.get('adminKey')
        if admin_key == '':
            flash('Admin key is required', 'danger')
            return redirect(url_for('register'))
        elif not (admin_key == valid_key):
            flash('Invalid admin key', 'danger')
            return redirect(url_for('register'))

    add_user(email, username, password, role, registration_date)
    flash('Your account has been created. You can now login', 'success')
    return redirect(url_for('login'))


@app.route('/login_post', methods=['POST'])
def login_post():
    mysql = connect()
    cur = mysql.cursor()
    username = request.form.get('username')
    global user
    user = username
    password = request.form.get('password')
    user_found = cur.execute('''SELECT `username` FROM `users` WHERE `username`=%s''', (username,))
    cur.execute('''SELECT `password` FROM `users` WHERE `username`=%s''', (username,))

    if user_found:
        password_dict = cur.fetchone()
        correct_password = password_dict["password"]
        cur.execute('''SELECT `role` FROM `users` WHERE `username`=%s''', (username,))
        role_dict = cur.fetchone()
        role = role_dict["role"]
        cur.close()

    if user_found and (password == correct_password):
        update_status(username, 'online')
        cur.close()
        get_name()
        if role == "admin":
            return redirect(url_for('admin_view'))
        else:
            return redirect(url_for('play'))

    if user_found and not (password == correct_password):
        cur.close()
        flash('Invalid password provided.', 'danger')
        return redirect(url_for('login'))

    if not user_found:
        cur.close()
        flash('No account associated with this username.', 'danger')
        return redirect(url_for('login'))


# PLAYER

@app.route('/scores', methods=['POST'])
def score_post():
    mysql = connect()
    cur = mysql.cursor()
    data = json.loads(request.data)
    username = data.get('username')
    score = data.get('moves')
    user_found = cur.execute('''SELECT `username` FROM `scores` WHERE `username`=%s''', (username,))
    if user_found:
        cur.execute('''SELECT `score` FROM `scores` WHERE `username`=%s''', (username,))
        score_dict = cur.fetchone()
        found_score = score_dict["score"]
        if score < found_score:
            update_score(username, score)
    else:
        add_score(username, score)

    cur.close
    return 'OK'


@app.route('/api/get_best_score', methods=['GET'])
def get_best_score():
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''SELECT MIN(score) FROM scores''')
    cur.close()
    score_dict = cur.fetchone()
    score = score_dict["MIN(score)"]
    return json.dumps(score)


@app.route('/get_name', methods=['GET'])
def get_name():
    return json.dumps(user)


# ADMIN


@app.route("/admin_view", methods=['GET'])
def admin_view():
    mysql = connect()
    cur = mysql.cursor()
    flash('Hi ' + user + ' !', 'primary')
    cur.execute('''SELECT `username` AS username , `score` AS score, `registrationDate` AS registrationDate  FROM `users`
    NATURAL JOIN `scores`''')
    players_data = cur.fetchall()
    cur.execute('''SELECT COUNT(*) AS users FROM `users`''')
    users_dict = cur.fetchone()
    users = users_dict["users"]
    cur.execute('''SELECT COUNT(*) AS online FROM `users` WHERE status = "online"''')
    online_dict = cur.fetchone()
    online = online_dict["online"]
    cur.close()

    return render_template("administrator.html", players_data=players_data, users_count=users, online_count=online)


@app.route("/users_count", methods=['GET'])
def users_count():
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''SELECT COUNT(username) AS users FROM `users`''')
    users_dict = cur.fetchone()
    users = users_dict["users"]
    cur.close()
    return json.dumps(users)


@app.route("/online_count", methods=['GET'])
def online_count():
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''SELECT COUNT(username) AS online FROM `users` WHERE status = "online"''')
    online_dict = cur.fetchone()
    online = online_dict["online"]
    cur.close()
    return json.dumps(online)


# HELPER FUNCTIONS


def add_user(email, username, password, role, date):
    mysql = connect()
    cur = mysql.cursor()
    cur.execute(
        '''INSERT INTO `users` (`email`, `username`, `password`,`role`, `registrationDate`) VALUES (%s, %s, %s, %s, %s)''',
        (email, username, password, role, date))
    mysql.commit()
    cur.close()


def add_score(username, score):
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''INSERT INTO `scores` (`username`, `score`) VALUES (%s, %s)''', (username, score))
    mysql.commit()
    cur.close()


def update_score(username, score):
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''UPDATE `scores` SET `score`=%s WHERE `username`=%s''', (score, username))
    mysql.commit()
    cur.close()


def update_status(username, status):
    mysql = connect()
    cur = mysql.cursor()
    cur.execute('''UPDATE `users` SET `status`=%s WHERE `username`=%s''', (status, username))
    mysql.commit()
    cur.close()

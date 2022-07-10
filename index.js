import express from "express";
const app = express();

import multer from 'multer';
const upload = multer({ dest: '/var/lib/mysql-files/gr2/uploads'});

import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { nanoid } from "nanoid";
import lodash from "lodash";
const idLength = 8;

import { Low, JSONFile } from 'lowdb';
const adapter = new JSONFile("db.json");
const db = new Low(adapter);

db.read();

db.data = db.data || { users: [] };

let port = 3000;

import mysql from "mysql";

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Vi-vam1234",
  database: "gr2"
});

con.connect(function(err) {
    if (err) throw err
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// parse application/json
app.use(bodyParser.json());

app.set("view engine", "pug");
app.set("views", "./views");
app.locals.basedir = "./views/components";

function auth(req, res, next) {
  if (!req.cookies.userId) {
    res.redirect("/users/signIn");
    return;
  }

  let user = db.data.users.find(function (user) {
    return user.id === req.cookies.userId;
  });

  if (!user) {
    res.redirect("/users/signIn");
    return;
  }

  next();
}

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/users/signUp", function (req, res) {
  if (req.cookies.userId) {
    res.clearCookie("userId");
  }
  res.render("user/create");
});

app.post("/users/signUp", function (req, res) {
  req.body.id = nanoid(idLength);
  let errors = [];
  if (!req.body.email) {
    errors.push("Email is required");
  }

  if (!req.body.password) {
    errors.push("Password is required");
  }

  if (!req.body.repass) {
    errors.push("You have to repeat password");
  }

  if (errors.length) {
    res.render("user/create", {
      errors: errors,
      values: req.body,
    });
    return;
  }

  if (req.body.password === req.body.repass) {
    db.data.users.push(req.body);
    db.write();
    res.send(
      '<script>alert("Sign Up successfully !"); window.location.href = "/users/signIn";</script>'
    );
  } else {
    errors.push("The repeated password is not correct");
    res.render("user/create", {
      errors: errors,
      values: req.body,
    });
    return;
  }
});

app.get("/users/signIn", function (req, res) {
  if (req.cookies.userId) {
    res.clearCookie("userId");
  }
  res.render("user/signIn");
});

app.post("/users/signIn", function (req, res) {
  let errors = [];
  let email = req.body.email;
  let password = req.body.password;

  if (!email) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length) {
    res.render("user/signIn", {
      errors: errors,
      values: req.body,
    });
    return;
  }

  let user = db.data.users.find(function (user) {
    return user.email === email;
  });

  if (!user) {
    // Wrong email
    errors.push("User not found!");
    res.render("user/signIn", {
      errors: errors,
      values: req.body,
    });
    return;
  } else {
    if (user.password !== password) {
      // Wrong password
      errors.push("Wrong password");
      res.render("user/signIn", {
        errors: errors,
        values: req.body,
      });
      return;
    } else {
      res.cookie("userId", user.id);
      res.render("index");
    }
  }
});

// --- API quan ly khoa hoc --- 
app.get('/mana_course', function(req, res) {
  let sql = "SELECT * FROM KhoaHoc";
  con.query(sql, function(err, result, fields) {
    if(err) throw err; 
    else {
      res.render('teacher/course_management/show_courses', {
        courses: result,
        length: result.length
      });
    }
  });
});

app.get('/add_course', function(req, res) {
  res.render('teacher/course_management/add_course');
});

app.post('/add_course', upload.single('avt'), function(req, res) {

  let course_id = req.body.id;
  let course_name = req.body.name;
  let course_desc = req.body.description;
  let path = req.file.path;

  var sql = "INSERT INTO KhoaHoc VALUES " + "('" + course_id 
    + "', '" + course_name + "', '" + course_desc + "', " + "LOAD_FILE('" + path + "'))";

  con.query(sql, function(err, result) {
      if(err) throw err;
      else {
        console.log(sql);
        res.redirect("/mana_course");
      }
      
  });
});

app.get('')

app.get('/show_courses', function(req, res) {

  let sql = "SELECT * FROM KhoaHoc";
  con.query(sql, function(err, result, fields) {
    if(err) throw err; 
    else {
      res.render('teacher/course_management/show_courses', {
        courses: result,
        length: result.length
      });
    }
  });
});

app.get('/view_course/:id', function(req, res) {
  let maKH = req.params.id;
  let sql = "SELECT * FROM KhoaHoc, BaiGiang WHERE MaKH = " + mysql.escape(maKH) + "AND maKH = BaiGiang.id_kh";
  con.query(sql, function(err, result, fields) {
    if(err) throw err;
    else {
      let title = "";
      // console.log(result, result.length);
      if(result.length == 0) {
        title = "";
      } else title = result[0].TenKH;
      res.render('teacher/course_management/view_course', {
        title: title,
        lessons: result,
        length: result.length
      });
    }
  });
});

app.get('/update_course/:id', function(req, res) {
  let maKH = req.params.id;

  let sql = "SELECT * FROM KhoaHoc WHERE MaKH = " + mysql.escape(maKH);
  con.query(sql, function(err, result) {
    if(err) throw err;
    else {
      res.render('teacher/course_management/update_course', {
        course_id: maKH,
        course_name: result[0].TenKH,
        course_desc: result[0].GioiThieu
      });
    }
  });
});

app.post('/update_course/:id', function(req, res) {
  let course_id = req.body.id;
  let course_name = req.body.name;
  let course_desc = req.body.description;

  let sql = "UPDATE KhoaHoc SET TenKH = " + mysql.escape(course_name) + 
  ", GioiThieu = " + mysql.escape(course_desc) + 
  " WHERE MaKH = " + mysql.escape(course_id);
  con.query(sql, function(err, result) {
    if(err) throw err;
    else {
      console.log(result);
      res.redirect("/view_course/" + course_id);
    }
  });
});

app.get('/delete_course/:id', function(req, res) {
  let maKH = req.params.id;
  let sql = "DELETE FROM KhoaHoc WHERE MaKh = " + mysql.escape(maKH);
  con.query(sql, function(err, result, fields) {
    if(err) throw err;
    else {
      res.redirect('/show_courses');
    }
  });
});

// --- Ket thuc API quan ly khoa hoc ---

// --- API quan ly bai giang

app.get('/show_lessons', function(req, res) {
  let sql = "SELECT * FROM BaiGiang";
  con.query(sql, function(err, result, fields) {
    if(err) throw err; 
    else {
      res.render('teacher/lesson_management/show_lessons', {
        lessons: result,
        length: result.length
      });
    }
  });
});

app.get('/add_lesson', function(req, res) {
  res.render('teacher/lesson_management/add_lesson');
});

app.post('/add_lesson', upload.single('video'), function(req, res) {

  let lesson_id = req.body.lesson_id;
  let course_id = req.body.course_id;
  let lesson_name = req.body.name;
  let content = req.body.content;
  let path = req.file.path;

  var sql = "INSERT INTO BaiGiang VALUES " + "('" + lesson_id 
    + "', '" + course_id + "', '" + lesson_name + "', '"  + content+ "', " + "LOAD_FILE('" + path + "')";

  con.query(sql, function(err, result) {
      if(err) throw err;
      else {
        console.log(result);
        res.redirect("/show_lessons");
      }
      
  });
});

app.get('/view_lesson/:id', function(req, res) {
  let maBG = req.params.id;
  let sql = "SELECT * FROM BaiGiang WHERE MaBG = " + mysql.escape(maBG);
  con.query(sql, function(err, result, fields) {
    if(err) throw err;
    else {
      console.log(result);
      // res.render('teacher/lesson_management/view_lesson', {
      //   src: result.Video
      // });
    }
  });
});

app.get('/update_lesson/:id', function(req, res) {
  let maBG = req.params.id;

  let sql = "SELECT * FROM BaiGiang WHERE MaBG = " + mysql.escape(maBG);
  con.query(sql, function(err, result) {
    if(err) throw err;
    else {
      res.render('teacher/lesson_management/update_lesson', {
        lesson_id: maBG,
        course_id: result[0].id_kh,
        lesson_name: result[0].TenBG,
        content: result[0].NoiDung
      });
    }
  });
});

app.post('/update_course/:id', function(req, res) {
  let lesson_id = req.body.lesson_id;
  let course_id = req.body.course_id;
  let lesson_name = req.body.name;
  let content = req.body.content;

  let sql = "UPDATE BaiGiang SET id_kh = " + mysql.escape(course_id) +
  "TenKH = " + mysql.escape(lesson_name) + 
  ", GioiThieu = " + mysql.escape(content) + 
  " WHERE MaBG = " + mysql.escape(lesson_id);
  con.query(sql, function(err, result) {
    if(err) throw err;
    else {
      console.log(result);
      res.redirect("/view_lesson/" + lesson_id);
    }
  });
});

app.get('/delete_lesson/:id', function(req, res) {
  let maBG = req.params.id;
  let sql = "DELETE FROM BaiGiang WHERE MaBG = " + mysql.escape(maBG);
  con.query(sql, function(err, result, fields) {
    if(err) throw err;
    else {
      res.redirect('/show_lessons');
    }
  });
});

// --- Ket thuc API quan ly bai giang

app.listen(port, function () {
  console.log("Server listening on port " + port);
});

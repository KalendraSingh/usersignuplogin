const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(5000, () => {
      console.log("Server Running at http://localhost:5000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    book
  ORDER BY
    book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, email, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      userinfo 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      userinfo (username, email, password)
     VALUES
      (
       '${username}',
       '${email}',
       '${hashedPassword}'  
      );`;
    await db.run(createUserQuery);
    response.json({ message: "User created successfully" }); // Send JSON response
  } else {
    response.status(400).json({ error: "User already exists" }); // Send JSON response
  }
});

// User Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  console.log(username, password);
  const selectUserQuery = `SELECT * FROM userinfo WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).json({ error: "Invalid User" }); // Send JSON response
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      //   const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      const jwt_token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJhaHVsIiwicm9sZSI6IlBSSU1FX1VTRVIiLCJpYXQiOjE2MjMwNjU1MzJ9.D13s5wN3Oh59aa_qtXMo3Ec4wojOx0EZh8Xr5C5sRkU";
      response.json({ jwt_token }); // Send JSON response
    } else {
      response.status(400).json({ error: "Invalid Password" }); // Send JSON response
    }
  }
});

app.post("/createtable", async (req, res) => {
  try {
    await db.exec(`
            CREATE TABLE userinfo (
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                password TEXT NOT NULL
            )
        `);
    res.json({ message: "Table created successfully" });
  } catch (error) {
    console.error("Error creating table:", error);
    res.status(500).json({ error: "Failed to create table" });
  }
});

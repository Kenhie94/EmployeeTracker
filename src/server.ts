import express, { Request, Response } from "express";
import { QueryResult } from "pg";
import { pool, connectToDb } from "./connection.js";
import inquirer from "inquirer";

await connectToDb();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// pool.query('SELECT role.title, role.salary, department.name AS department FROM role JOIN department ON role.department_id = department.id;', (err: Error, result: QueryResult) => {
//   if (err) {
//     console.log(err);
//   } else if (result) {
//     console.log(result.rows);
//   }
// });

function startInquirer() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: ["View All Employees", "Add Employee", "Update Employee Role", "View All Role", "Add Role", "View All Department", "Add Department", "Exit"],
      },
    ])
    .then(async (answers) => {
      // Handle each user selection
      switch (answers.action) {
        case "View All Employees":
          await viewAllEmployees();
          break;
        case "Add Employee":
          await addEmployee();
          break;
        // case "Update Employee Role":
        //   await updateEmployeeRole();
        //   break;
        // case "View All Roles":
        //   await viewAllRoles();
        //   break;
        // case "Add Role":
        //   await addRole();
        //   break;
        // case "View All Departments":
        //   await viewAllDepartments();
        //   break;
        // case "Add Department":
        //   await addDepartment();
        //   break;
        case "Exit":
          console.log("Goodbye!");
          process.exit(0);
      }
    });
}

async function viewAllEmployees(): Promise<void> {
  const query = `
    SELECT 
      e.id AS "ID",
      e.first_name AS "First Name",
      e.last_name AS "Last Name",
      role.title AS "Title",
      department.name AS "Department",
      role.salary AS "Salary",
      CONCAT(m.first_name, ' ', m.last_name) AS "Manager"
    FROM employee e
    LEFT JOIN role ON e.role_id = role.id
    LEFT JOIN department ON role.department_id = department.id
    LEFT JOIN employee m ON e.manager_id = m.id
    ORDER BY e.id;
  `;

  try {
    const result: QueryResult = await pool.query(query);
    console.table(result.rows);
    startInquirer();
  } catch (err) {
    console.error("Error fetching employees:", err);
  }
}

async function addEmployee(): Promise<void> {
  try {
    const roleQuery: QueryResult = await pool.query("SELECT id, title FROM role");
    const managerQuery: QueryResult = await pool.query("SELECT id, first_name, last_name FROM employee");

    const roleChoices = roleQuery.rows.map((role) => ({
      name: role.title,
      value: role.id,
    }));

    const managerChoices = [
      { name: "None", value: null },
      ...managerQuery.rows.map((manager) => ({
        name: `${manager.first_name} ${manager.last_name}`,
        value: manager.id,
      })),
    ];

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "newEmployeeFirstName",
        message: "What is the employee's first name?",
      },
      {
        type: "input",
        name: "newEmployeeLastName",
        message: "What is the employee's last name?",
      },
      {
        type: "list",
        name: "newEmployeeRole",
        message: "What is the employee's role?",
        choices: roleChoices,
      },
      {
        type: "list",
        name: "newEmployeeManager",
        message: "Who is the employee's manager?",
        choices: managerChoices,
      },
    ]);

    const { newEmployeeFirstName, newEmployeeLastName, newEmployeeRole, newEmployeeManager } = answers;

    await pool.query(`INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)`, [newEmployeeFirstName, newEmployeeLastName, newEmployeeRole, newEmployeeManager]);

    console.log(`Employee ${newEmployeeFirstName} ${newEmployeeLastName} added successfully!`);
    startInquirer();
  } catch (err) {
    console.error("Error adding employee", err);
  }
}

app.use((_req: Request, res: Response) => {
  res.status(404).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startInquirer();
});

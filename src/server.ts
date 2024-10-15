import express, { Request, Response } from "express";
import { QueryResult } from "pg";
import { pool, connectToDb } from "./connection.js";
import inquirer from "inquirer";

await connectToDb();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Starts the program
function startInquirer() {
  inquirer
    .prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: ["View All Employees", "Add Employee", "Update Employee Role", "View All Roles", "Add Role", "View All Departments", "Add Department", "Exit"],
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
        case "Update Employee Role":
          await updateEmployeeRole();
          break;
        case "View All Roles":
          await viewAllRoles();
          break;
        case "Add Role":
          await addRole();
          break;
        case "View All Departments":
          await viewAllDepartments();
          break;
        case "Add Department":
          await addDepartment();
          break;
        case "Exit":
          console.log("Goodbye!");
          process.exit(0);
      }
    });
}

// Function to view all employees
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

// Function to add new employees
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

// Function to update employees roles
async function updateEmployeeRole(): Promise<void> {
  try {
    const employeeQuery: QueryResult = await pool.query("SELECT id, first_name, last_name FROM employee");
    const roleQuery: QueryResult = await pool.query("SELECT id, title FROM role");

    const employeeChoices = employeeQuery.rows.map((employee) => ({
      name: `${employee.first_name} ${employee.last_name}`,
      value: employee.id,
    }));
    const roleChoices = roleQuery.rows.map((role) => ({
      name: role.title,
      value: role.id,
    }));

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "chosenEmployee",
        message: "Which employee's role do you want to update?",
        choices: employeeChoices,
      },
      {
        type: "list",
        name: "chosenRole",
        message: "Which role do you want to assign the selected employee",
        choices: roleChoices,
      },
    ]);

    const { chosenEmployee, chosenRole } = answers;

    await pool.query(`UPDATE employee SET role_id = $1 WHERE id = $2`, [chosenRole, chosenEmployee]);
    console.log(`Employee's role has been updated successfully`);
    startInquirer();
  } catch (err) {
    console.error("Error updating employee's role:", err);
  }
}

// Function to view all roles
async function viewAllRoles(): Promise<void> {
  try {
    const result: QueryResult = await pool.query("SELECT role.id, role.title, role.salary, department.name AS department FROM role JOIN department ON role.department_id = department.id");

    console.table(result.rows);
    startInquirer();
  } catch (err) {
    console.error("Error fetching roles:", err);
  }
}

// Function to add new roles
async function addRole(): Promise<void> {
  try {
    const departmentQuery: QueryResult = await pool.query("SELECT id, name FROM department");

    const departmentChoices = departmentQuery.rows.map((department) => ({
      name: department.name,
      value: department.id,
    }));

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "newRole",
        message: "What is the title of the new role?",
      },
      {
        type: "input",
        name: "newRoleSalary",
        message: "What is the salary of this new role?",
        validate: (input) => {
          return !isNaN(parseFloat(input)) || "Please enter a valid number";
        },
      },
      {
        type: "list",
        name: "chosenDepartment",
        message: "Which department is this role in?",
        choices: departmentChoices,
      },
    ]);

    const { newRole, newRoleSalary, chosenDepartment } = answers;

    await pool.query(`INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)`, [newRole, parseFloat(newRoleSalary), chosenDepartment]);

    console.log(`${newRole} added succesfully`);
    startInquirer();
  } catch (err) {
    console.error("Error adding role", err);
  }
}

// Function to view all departments
async function viewAllDepartments(): Promise<void> {
  try {
    const result: QueryResult = await pool.query(`SELECT * FROM department`);
    console.table(result.rows);
    startInquirer();
  } catch (err) {
    console.error("Error fetching department:", err);
  }
}

// Function to add new department
async function addDepartment(): Promise<void> {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "newDepartment",
        message: "What is the name of the new department?",
      },
    ]);

    const { newDepartment } = answers;

    await pool.query("INSERT INTO department (name) VALUES ($1)", [newDepartment]);

    console.log(`${newDepartment} added successfully`);
    startInquirer();
  } catch (err) {
    console.error("Error adding department,", err);
  }
}

app.use((_req: Request, res: Response) => {
  res.status(404).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startInquirer();
});

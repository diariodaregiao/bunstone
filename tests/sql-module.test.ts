import { expect, test, describe } from "bun:test";
import {
  Module,
  Injectable,
  AppStartup,
  SqlModule,
  SqlService,
  CommandBus,
} from "../index";
import { CqrsModule } from "../lib/cqrs/cqrs-module";

describe("SqlModule & Global DI", () => {
  test("should register SqlModule globally and inject SqlService", async () => {
    @Injectable()
    class TestService {
      constructor(public readonly sqlService: SqlService) {}
    }

    @Module({
      providers: [TestService],
    })
    class FeatureModule {}

    @Module({
      imports: [SqlModule.register("sqlite://:memory:"), FeatureModule],
    })
    class RootModule {}

    AppStartup.create(RootModule);

    // Get the injectables map from the module metadata
    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      FeatureModule
    );
    const testService = injectables.get(TestService);

    expect(testService).toBeDefined();
    expect(testService.sqlService).toBeInstanceOf(SqlService);
  });

  test("CqrsModule should also be available globally", async () => {
    @Injectable()
    class CqrsTestService {
      constructor(public readonly commandBus: CommandBus) {}
    }

    @Module({
      providers: [CqrsTestService],
    })
    class OtherFeatureModule {}

    @Module({
      imports: [CqrsModule, OtherFeatureModule],
    })
    class CqrsRootModule {}

    AppStartup.create(CqrsRootModule);

    const injectables: Map<any, any> = Reflect.getMetadata(
      "dip:injectables",
      OtherFeatureModule
    );
    const cqrsService = injectables.get(CqrsTestService);

    expect(cqrsService).toBeDefined();
    expect(cqrsService.commandBus).toBeInstanceOf(CommandBus);
  });

  test("should perform real queries using SQLite in-memory", async () => {
    @Module({
      imports: [SqlModule.register("sqlite://:memory:")],
    })
    class SqlRootModule {}

    AppStartup.create(SqlRootModule);
    const sqlService = new SqlService();

    // Create table
    await sqlService.query(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"
    );

    // Insert data using .query()
    await sqlService.query("INSERT INTO users (name) VALUES (?)", ["Alice"]);

    // Insert data using .sql tag
    const name = "Bob";
    await sqlService.query(`INSERT INTO users (name) VALUES (?)`, [name]);

    // Select data
    const users = await sqlService.query("SELECT * FROM users ORDER BY id ASC");

    expect(users).toHaveLength(2);
    expect(users[0].name).toBe("Alice");
    expect(users[1].name).toBe("Bob");
  });

  test("should perform advanced SQL operations (Update, Delete, Join)", async () => {
    @Module({
      imports: [SqlModule.register("sqlite://:memory:")],
    })
    class AdvancedSqlRootModule {}

    AppStartup.create(AdvancedSqlRootModule);
    const sqlService = new SqlService();

    // Table Setup
    await sqlService.query(
      "CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT)"
    );
    await sqlService.query(
      "CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER)"
    );

    // Insert Data
    await sqlService.query("INSERT INTO departments (name) VALUES (?)", [
      "Engineering",
    ]);
    await sqlService.query("INSERT INTO departments (name) VALUES (?)", [
      "Marketing",
    ]);

    await sqlService.query(
      "INSERT INTO employees (name, dept_id) VALUES (?, ?)",
      ["John", 1]
    );
    await sqlService.query(
      "INSERT INTO employees (name, dept_id) VALUES (?, ?)",
      ["Jane", 1]
    );
    await sqlService.query(
      "INSERT INTO employees (name, dept_id) VALUES (?, ?)",
      ["Mike", 2]
    );

    // Update
    await sqlService.query("UPDATE employees SET name = ? WHERE name = ?", [
      "John Doe",
      "John",
    ]);
    const updated = await sqlService.query(
      "SELECT name FROM employees WHERE name = ?",
      ["John Doe"]
    );
    expect(updated[0].name).toBe("John Doe");

    // Join
    const joined = await sqlService.query(
      `
      SELECT e.name as employee, d.name as department 
      FROM employees e 
      JOIN departments d ON e.dept_id = d.id 
      WHERE d.name = ?
    `,
      ["Engineering"]
    );
    expect(joined).toHaveLength(2);
    expect(joined.some((r: any) => r.employee === "John Doe")).toBe(true);
    expect(joined.some((r: any) => r.employee === "Jane")).toBe(true);

    // Delete
    await sqlService.query("DELETE FROM employees WHERE name = ?", ["Mike"]);
    const remaining = await sqlService.query("SELECT * FROM employees");
    expect(remaining).toHaveLength(2);

    // Aggregate
    const counts = await sqlService.query(
      "SELECT COUNT(*) as total FROM departments"
    );
    expect(counts[0].total).toBe(2);
  });

  test("should perform SQL operations with IN, LIKE, and BETWEEN", async () => {
    @Module({
      imports: [SqlModule.register("sqlite://:memory:")],
    })
    class OperatorsSqlRootModule {}

    AppStartup.create(OperatorsSqlRootModule);
    const sqlService = new SqlService();

    await sqlService.query(
      "CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL)"
    );

    await sqlService.query(
      "INSERT INTO products (name, price) VALUES (?, ?), (?, ?), (?, ?), (?, ?)",
      ["Apple", 1.5, "Banana", 0.5, "Cherry", 2.0, "Date", 3.0]
    );

    // IN operator
    // Note: Standard SQLite parameter binding for IN (?) usually requires one ? per element
    // or using the array support if the driver allows. Bun SQL supports arrays in some contexts.
    // For raw .query strings, we might need to build the (?, ?) string if the driver doesn't auto-expand.
    const inResults = await sqlService.query(
      "SELECT * FROM products WHERE name IN (?, ?)",
      ["Apple", "Banana"]
    );
    expect(inResults).toHaveLength(2);

    // LIKE operator
    const likeResults = await sqlService.query(
      "SELECT * FROM products WHERE name LIKE ?",
      ["%a%"] // Apple, Banana, Date
    );
    expect(likeResults).toHaveLength(3);

    // BETWEEN operator
    const betweenResults = await sqlService.query(
      "SELECT * FROM products WHERE price BETWEEN ? AND ?",
      [1.0, 2.5] // Apple (1.5), Cherry (2.0)
    );
    expect(betweenResults).toHaveLength(2);
    expect(betweenResults.some((p: any) => p.name === "Apple")).toBe(true);
    expect(betweenResults.some((p: any) => p.name === "Cherry")).toBe(true);
  });

  test("should perform SQL operations with Subqueries and CASE", async () => {
    @Module({
      imports: [SqlModule.register("sqlite://:memory:")],
    })
    class SubqueriesSqlRootModule {}

    AppStartup.create(SubqueriesSqlRootModule);
    const sqlService = new SqlService();

    await sqlService.query(
      "CREATE TABLE orders (id INTEGER PRIMARY KEY, total REAL, customer_id INTEGER)"
    );
    await sqlService.query(
      "CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT)"
    );

    await sqlService.query("INSERT INTO customers (name) VALUES (?), (?)", [
      "Alice",
      "Bob",
    ]);
    await sqlService.query(
      "INSERT INTO orders (total, customer_id) VALUES (?, ?), (?, ?), (?, ?)",
      [100.0, 1, 200.0, 1, 50.0, 2]
    );

    // Subquery in WHERE
    const subqueryResults = await sqlService.query(
      "SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders WHERE total > ?)",
      [150.0]
    );
    expect(subqueryResults).toHaveLength(1);
    expect(subqueryResults[0].name).toBe("Alice");

    // CASE expression
    const caseResults = await sqlService.query(
      `SELECT total, 
       CASE WHEN total > 150 THEN 'High' 
            WHEN total > 75 THEN 'Medium' 
            ELSE 'Low' END as category 
       FROM orders ORDER BY total DESC`
    );
    expect(caseResults[0].category).toBe("High");
    expect(caseResults[1].category).toBe("Medium");
    expect(caseResults[2].category).toBe("Low");
  });
});

import { Model, Persistence } from "../src";
import { createSqliteAdapter } from "./sqlite-adapter";
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

type PersonAttrs = {
  id?: string;
  firstName: string;
  lastName: string;
  age: number;
}

@Persistence(createSqliteAdapter({ dbName: "test_db", tableName: "people", primaryKeyField: "id" }))
class Person extends Model<PersonAttrs> {
  public fullName() {
    return `${this.get("firstName")} ${this.get("lastName")}`;
  }

  public birthYear() {
    return new Date().getFullYear() - this.get("age");
  }
}

describe('Model', () => {
  const dbPath = '/tmp/test_db.db';

  beforeAll(async () => {
    const adapter = createSqliteAdapter({
      dbName: "test_db",
      tableName: "people",
      primaryKeyField: "id"
    });
    const ctx = await adapter.getContext();
    await ctx.db.run(
      "CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, age INTEGER)"
    );
  });

  afterAll(async () => {
    if (existsSync(dbPath)) {
      await unlink(dbPath);
    }
  });

  it('should create and save a new person', async () => {
    const person = new Person({
      firstName: "John",
      lastName: "Doe",
      age: 30
    });

    expect(person.persisted).toBe(false);
    expect(person.get("id")).toBeUndefined();

    await person.save();

    expect(person.persisted).toBe(true);
    expect(person.get("id")).toBeDefined();
  });

  it('should load a saved person', async () => {
    const person = new Person({
      firstName: "Jane",
      lastName: "Smith",
      age: 25
    });
    await person.save();

    const loadedPerson = await Person.get(person.get("id"));
    expect(loadedPerson).not.toBeNull();
    expect(loadedPerson?.get("firstName")).toBe("Jane");
    expect(loadedPerson?.get("lastName")).toBe("Smith");
    expect(loadedPerson?.get("age")).toBe(25);
    expect(loadedPerson?.fullName()).toBe("Jane Smith");
  });

  it('should track changed fields', async () => {
    const person = new Person({
      firstName: "Bob",
      lastName: "Wilson",
      age: 40
    });

    expect(person.getChangedFields()).toEqual(["firstName", "lastName", "age"]);
    await person.save();
    expect(person.getChangedFields()).toEqual([]);

    person.set("firstName", "Robert");
    expect(person.getChangedFields()).toEqual(["firstName"]);
    await person.save();
    expect(person.getChangedFields()).toEqual([]);

    const loadedPerson = await Person.get(person.get("id"));
    expect(loadedPerson?.get("firstName")).toBe("Robert");
    expect(loadedPerson?.get("lastName")).toBe("Wilson");
    expect(loadedPerson?.get("age")).toBe(40);
  });

  it('should retrieve all people', async () => {
    // Create multiple people
    await new Person({
      firstName: "Alice",
      lastName: "Johnson",
      age: 28
    }).save();

    await new Person({
      firstName: "Charlie",
      lastName: "Brown",
      age: 35
    }).save();

    const allPeople = await Person.all();
    expect(allPeople.length).toBeGreaterThanOrEqual(2);
    expect(allPeople[0]).toBeInstanceOf(Person);
  });

  it('should retrieve people by criteria', async () => {
    // Create a person with specific age
    await new Person({
      firstName: "David",
      lastName: "Miller",
      age: 45
    }).save();

    const peopleAge45 = await Person.all({ age: 45 });
    expect(peopleAge45.length).toBeGreaterThan(0);
    expect(peopleAge45[0]?.get("age")).toBe(45);

    const personByName = await Person.getBy({ firstName: "David" });
    expect(personByName).not.toBeNull();
    expect(personByName?.get("lastName")).toBe("Miller");
  });

  it('should delete a person', async () => {
    const person = new Person({
      firstName: "ToDelete",
      lastName: "User",
      age: 50
    });
    await person.save();
    const id = person.get("id");

    // Verify person exists
    let loadedPerson = await Person.get(id);
    expect(loadedPerson).not.toBeNull();

    // Delete the person
    const success = await person.del();
    expect(success).toBe(true);

    // Verify person no longer exists
    loadedPerson = await Person.get(id);
    expect(loadedPerson).toBeNull();
  });
});

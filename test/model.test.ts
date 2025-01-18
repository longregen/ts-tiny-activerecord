import { Model, Persistence } from "../src";
import { createSqliteAdapter } from "./sqlite-adapter";
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

interface PersonAttrs {
  firstName: string;
  lastName: string;
  age: number;
}

@Persistence(createSqliteAdapter("test_db", "people"))
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
    const adapter = createSqliteAdapter("test_db", "people");
    const ctx = await adapter.getContext();
    await ctx.db.run(
      "CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, firstName TEXT, lastName TEXT, age INTEGER)"
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
    expect(person.id).toBeUndefined();

    await person.save();

    expect(person.persisted).toBe(true);
    expect(person.id).toBeDefined();
  });

  it('should load a saved person', async () => {
    const person = new Person({
      firstName: "Jane",
      lastName: "Smith",
      age: 25
    });
    await person.save();

    const loadedPerson = await Person.load(person.id);
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

    const loadedPerson = await Person.load(person.id);
    expect(loadedPerson?.get("firstName")).toBe("Robert");
    expect(loadedPerson?.get("lastName")).toBe("Wilson");
    expect(loadedPerson?.get("age")).toBe(40);
  });
});

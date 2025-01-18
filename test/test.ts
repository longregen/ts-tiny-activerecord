import { Model, Persistence } from "../src";
import { createSqliteAdapter } from "./sqlite-adapter";

interface PersonAttrs {
  firstName: string;
  lastName: string;
  age: number;
}

@Persistence(createSqliteAdapter("test", "people"))
class Person extends Model<PersonAttrs> {
  public fullName() {
    return `${this.get("firstName")} ${this.get("lastName")}`;
  }

  public birthYear() {
    return new Date().getFullYear() - this.get("age");
  }
}

async function main() {
  const adapter = createSqliteAdapter("test", "people");
  const ctx = await adapter.getContext();
  await ctx.db.run("CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, firstName TEXT, lastName TEXT, age INTEGER)");

  const person = new Person({ firstName: "John", lastName: "Doe", age: 30 });
  console.log(person);
  console.log(person.id);
  console.log(person.persisted);
  console.log(person.getChangedFields())
  await person.save();
  console.log(person);
  console.log(person.id);
  console.log(person.persisted);
  console.log(person.getChangedFields())

  const person2 = await Person.load(person.id);
  console.log(person2);
  console.log(person2?.fullName());
  console.log(person2?.birthYear());
  person2?.set("firstName", "Jane");
  console.log(person2?.getChangedFields());
  await person2?.save();
  console.log(person2);
  console.log(person2?.fullName());
}

main();
# ts-tiny-activerecord: The lil'est ActiveRecord for TypeScript

A type-safe model persistence library for TypeScript that provides a flexible way to manage data models with database persistence.

## Features

- 🔒 Full TypeScript type safety
- 🔄 Change tracking for efficient updates
- 🎯 Customizable field persistence
- 🔌 Pluggable adapter system
- 🎨 Decorator-based configuration

## Installation

```bash
npm install [TBD]
```

## Basic Usage

Define your model by extending the base `Model` class and using the `@Persistence` decorator:

```typescript
interface PersonAttrs {
  firstName: string;
  lastName: string;
  age: number;
}

@Persistence(createSqliteAdapter("mydb", "people"))
class Person extends Model<PersonAttrs> {
  public fullName() {
    return `${this.get("firstName")} ${this.get("lastName")}`;
  }
}
```

### Creating and Saving Models

```typescript
// Create a new person
const person = new Person({
  firstName: "John",
  lastName: "Doe",
  age: 30
});

// Save to database
await person.save();

// Update fields
person.set("firstName", "Jane");
await person.save();

// Bulk update fields
person.set({
  firstName: "Jane",
  lastName: "Smith"
});
await person.save();
```

The library keeps track of which fields have changed and passes them to the adapter to allow it to generate minimal database updates.

### Loading Models

```typescript
// Load by ID
const person = await Person.load("some-id");
if (person) {
  console.log(person.fullName());
}
```

## Type Safety

The library is built with TypeScript type safety in mind. Model fields are strictly typed based on the interface you provide.

```typescript
// This will cause a TypeScript error
person.get("nonexistentField");

// This will also cause a TypeScript error
person.set("age", "thirty");
```

## Advanced Features

### Custom Field Persistence

You can control how fields are persisted using field specifications:

```typescript
@Persistence(adapter, {
  secretField: { persist: false },
  jsonField: {
    encoder: {
      encode: (value: object) => JSON.stringify(value),
      decode: (value: string) => JSON.parse(value)
    }
  }
})
class AdvancedModel extends Model<Attrs> {
  // ...
}
```

### Lifecycle Hooks

Add global hooks for pre/post save and post load operations:

```typescript
@Persistence(adapter, fieldSpecs, {
  preSave: async (context, model) => {
    // Modify model before saving
    return model;
  },
  postSave: async (context, model) => {
    // Handle post-save operations
    return model;
  },
  postLoad: async (context, model) => {
    // Process model after loading
    return model;
  }
})
```

### Custom Adapters

Create custom adapters for different databases by implementing the `AdapterConfig` interface:

```typescript
interface AdapterConfig<C, T> {
  getContext(): Promise<C>;
  getFromDb(context: C, id: any): Promise<(T & { id: string }) | null>;
  saveToDb(context: C, model: Model<T, C>, fields: (keyof T)[]): Promise<SaveResult>;
}
```
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

### Reading and Writing Fields

```typescript
// Get a single field
const firstName = person.get("firstName");

// Set a single field (marks as changed)
person.set("firstName", "Jane");

// Set multiple fields (marks all as changed)
person.set({
  firstName: "Jane",
  lastName: "Smith"
});

// Set fields without marking as changed
person.put("firstName", "Jane");
person.put({
  firstName: "Jane",
  lastName: "Smith"
});
```

### Loading and Querying Models

```typescript
// Load by ID
const person = await Person.get("some-id");

// Find first match by criteria
const jane = await Person.getBy({ firstName: "Jane" });

// Get all records
const allPeople = await Person.all();

// Get all matching criteria
const adults = await Person.all({ age: 18 });

// Get all with SQL query (if adapter supports it)
const adults = await Person.all(
  "SELECT * FROM people WHERE age > ?", [18]
);
```

### Deleting Models

```typescript
// Delete a model
const success = await person.del();
```

### Change Tracking

```typescript
// Check if model is persisted
console.log(person.persisted);

// Get array of changed field names
const changes = person.getChangedFields();

// Manually mark fields as changed/unchanged
person.markChanged("firstName");
person.markUnchanged("firstName");

// Clear all change tracking
person.clearChangedFields();
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
  // Get the database context
  getContext(): Promise<C>;
  
  // Query methods
  get(context: C, id: any): Promise<(T & { id: string }) | null>;
  getBy(context: C, matchOrQuery: Partial<T> | string, bindValues?: any[]): Promise<(T & { id: string }) | null>;
  all(context: C, matchOrQuery?: Partial<T> | string, bindValues?: any[]): Promise<(T & { id: string })[]>;
  
  // Persistence methods
  insert(context: C, data: Partial<T>): Promise<SaveResult>;
  update(context: C, model: Model<T>, data: Partial<T>): Promise<SaveResult>;
  del(context: C, model: Model<T>): Promise<boolean>;
}

// The SaveResult interface for insert/update operations
interface SaveResult {
  success: boolean;
  inserted: boolean;
  id?: string;
  rows: number;
}
```

Each adapter method serves a specific purpose:
- `getContext()`: Establishes the database connection or context
- `get()`: Retrieves a single record by ID
- `getBy()`: Retrieves first record matching criteria or SQL query
- `all()`: Retrieves all records, optionally filtered by criteria or SQL query
- `insert()`: Creates a new record
- `update()`: Updates an existing record
- `del()`: Deletes a record

The `SaveResult` interface provides detailed information about save operations:
- `success`: Whether the operation succeeded
- `inserted`: Whether a new record was inserted
- `id`: The ID of the newly inserted record (for inserts)
- `rows`: Number of rows affected
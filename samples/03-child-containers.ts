import { Container, token } from "dockdi";

interface Database {
  readonly connected: boolean;
}

interface RequestContext {
  readonly userId: string;
}

const DatabaseToken = token<Database>("Database");
const RequestContextToken = token<RequestContext>("RequestContext");

const root = new Container();
root.bind(DatabaseToken).toValue({ connected: true });

const requestA = root.scope();
requestA.bind(RequestContextToken).toValue({ userId: "user-1" });

const requestB = root.scope();
requestB.bind(RequestContextToken).toValue({ userId: "user-2" });

console.log(
  `shared singleton from parent -> ${
    requestA.resolve(DatabaseToken) === requestB.resolve(DatabaseToken)
  }`,
);

console.log(
  `request A user -> ${requestA.resolve(RequestContextToken).userId}`,
);
console.log(
  `request B user -> ${requestB.resolve(RequestContextToken).userId}`,
);

console.log(`root knows RequestContext -> ${root.has(RequestContextToken)}`);
console.log(
  `request A knows RequestContext -> ${requestA.has(RequestContextToken)}`,
);

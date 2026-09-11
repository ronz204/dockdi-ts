import { Container, token } from "dockdi";
import { bench, group, run } from "mitata";

class UserRepo {
  public findUser(id: string): { id: string; name: string } {
    return { id, name: "user" };
  }
}

class UserService {
  constructor(public readonly repo: UserRepo) {}
}

const RepoToken = token<UserRepo>("UserRepo");
const ServiceToken = token<UserService>("UserService");
const FactoryToken = token<{ timestamp: number }>("Factory");
const ValueToken = token<string>("Value");

const container = new Container();
container.bind(RepoToken).toClass(UserRepo).inSingleton();
container.bind(ServiceToken).toClass(UserService, [RepoToken]).inTransient();
container
  .bind(FactoryToken)
  .toFactory(() => ({ timestamp: 123 }))
  .inTransient();
container.bind(ValueToken).toValue("static-value");

group("Instantiation Providers Comparison", () => {
  bench("toClass instantiation with dependency", () => {
    container.resolve(ServiceToken);
  });

  bench("toFactory execution", () => {
    container.resolve(FactoryToken);
  });

  bench("toValue lookup", () => {
    container.resolve(ValueToken);
  });

  bench("toClass singleton cache hit", () => {
    container.resolve(RepoToken);
  });
});

await run();

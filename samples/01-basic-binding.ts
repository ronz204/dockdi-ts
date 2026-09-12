import { Container, token } from "dockdi";

interface AppConfig {
  readonly appName: string;
  readonly retries: number;
}

const ConfigToken = token<AppConfig>("AppConfig");

interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  public log(message: string): void {
    console.log(`[app] ${message}`);
  }
}

const LoggerToken = token<Logger>("Logger");

class Greeter {
  constructor(
    private readonly logger: Logger,
    private readonly config: AppConfig,
  ) {}

  public greet(name: string): void {
    this.logger.log(`Hello, ${name}! (${this.config.appName})`);
  }
}

const GreeterToken = token<Greeter>("Greeter");

interface RequestId {
  readonly value: string;
}

const RequestIdToken = token<RequestId>("RequestId");

const container = new Container();

container.bind(ConfigToken).toValue({ appName: "dockdi-sample", retries: 3 });
container.bind(LoggerToken).toClass(ConsoleLogger);
container.bind(GreeterToken).toClass(Greeter, [LoggerToken, ConfigToken]);
container
  .bind(RequestIdToken)
  .toFactory(() => ({ value: `req-${Math.floor(Math.random() * 1000)}` }));

const greeter = container.resolve(GreeterToken);
greeter.greet("world");

const requestId = container.resolve(RequestIdToken);
console.log(`Generated request id: ${requestId.value}`);

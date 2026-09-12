import { Container, type Module, token } from "dockdi";

interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

interface Logger {
  log(message: string): void;
}

class TimestampedLogger implements Logger {
  constructor(private readonly clock: Clock) {}

  public log(message: string): void {
    console.log(`[${this.clock.now().toISOString()}] ${message}`);
  }
}

const ClockToken = token<Clock>("Clock");
const LoggerToken = token<Logger>("Logger");

const infrastructureModule: Module = (container) => {
  container.bind(ClockToken).toClass(SystemClock).inSingleton();
  container.bind(LoggerToken).toClass(TimestampedLogger, [ClockToken]);
};

interface Greeter {
  greet(name: string): void;
}

class LoggingGreeter implements Greeter {
  constructor(private readonly logger: Logger) {}

  public greet(name: string): void {
    this.logger.log(`Hello, ${name}!`);
  }
}

const GreeterToken = token<Greeter>("Greeter");

const applicationModule: Module = (container) => {
  container.bind(GreeterToken).toClass(LoggingGreeter, [LoggerToken]);
};

const container = new Container().load(infrastructureModule, applicationModule);

container.resolve(GreeterToken).greet("world");

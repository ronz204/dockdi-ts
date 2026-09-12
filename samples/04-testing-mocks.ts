import { Container, token } from "dockdi";

interface EmailSender {
  send(to: string, message: string): void;
}

class RealEmailSender implements EmailSender {
  public send(to: string, message: string): void {
    console.log(`[real] sending "${message}" to ${to}`);
  }
}

class RecordingEmailSender implements EmailSender {
  public readonly sent: Array<{ to: string; message: string }> = [];

  public send(to: string, message: string): void {
    this.sent.push({ to, message });
  }
}

class OrderService {
  constructor(private readonly emailSender: EmailSender) {}

  public placeOrder(customerEmail: string): void {
    this.emailSender.send(customerEmail, "Order confirmed!");
  }
}

const EmailToken = token<EmailSender>("EmailSender");
const OrderServiceToken = token<OrderService>("OrderService");

function buildProductionContainer(): Container {
  const container = new Container();
  container.bind(EmailToken).toClass(RealEmailSender).inSingleton();
  container.bind(OrderServiceToken).toClass(OrderService, [EmailToken]);
  return container;
}

const production = buildProductionContainer();

const testScope = production.scope();
const recordingSender = new RecordingEmailSender();
testScope.override(EmailToken).toValue(recordingSender);

const orderInTest = testScope.resolve(OrderServiceToken);
orderInTest.placeOrder("customer@example.com");

console.log(`recorded emails in test scope -> ${recordingSender.sent.length}`);

// production was never touched: it still resolves the real sender
production.resolve(OrderServiceToken).placeOrder("real-customer@example.com");

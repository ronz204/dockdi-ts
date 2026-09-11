import { Container, MissingTokenError, token } from "dockdi";
import { describe, expect, it } from "vitest";

interface EmailSender {
  send(to: string, message: string): void;
}

class RealEmailSender implements EmailSender {
  public sentCount = 0;
  public send(_to: string, _message: string): void {
    this.sentCount++;
  }
}

class MockEmailSender implements EmailSender {
  public sentEmails: Array<{ to: string; message: string }> = [];
  public send(to: string, message: string): void {
    this.sentEmails.push({ to, message });
  }
}

class NotificationService {
  constructor(public readonly emailSender: EmailSender) {}

  public notifyUser(email: string, text: string): void {
    this.emailSender.send(email, text);
  }
}

class OrderService {
  constructor(public readonly notifier: NotificationService) {}

  public placeOrder(customerEmail: string): void {
    this.notifier.notifyUser(customerEmail, "Order confirmed!");
  }
}

describe("Testing Utilities & Overrides", () => {
  const EmailToken = token<EmailSender>("EmailSender");
  const NotifierToken = token<NotificationService>("NotificationService");
  const OrderToken = token<OrderService>("OrderService");

  function createProductionContainer(): Container {
    const container = new Container();
    container.bind(EmailToken).toClass(RealEmailSender).inSingleton();
    container.bind(NotifierToken).toClass(NotificationService, [EmailToken]);
    container.bind(OrderToken).toClass(OrderService, [NotifierToken]);
    return container;
  }

  it("allows direct mutable overrides on a container for fast unit testing", () => {
    const container = createProductionContainer();
    const mockEmail = new MockEmailSender();

    // Reemplaza el servicio real por el mock antes de resolver
    container.override(EmailToken).toValue(mockEmail);

    const orderService = container.resolve(OrderToken);
    orderService.placeOrder("user@example.com");

    expect(mockEmail.sentEmails).toHaveLength(1);
    expect(mockEmail.sentEmails[0]).toEqual({
      to: "user@example.com",
      message: "Order confirmed!",
    });
  });

  it("evicts previously cached singletons when a token is overridden", () => {
    const ServiceToken = token<{ id: number }>("Service");
    const container = new Container();
    let counter = 0;

    container
      .bind(ServiceToken)
      .toFactory(() => ({ id: ++counter }))
      .inSingleton();

    const original = container.resolve(ServiceToken);
    expect(original.id).toBe(1);

    // Sobreescribe el singleton ya resuelto
    container.override(ServiceToken).toValue({ id: 999 });

    const overridden = container.resolve(ServiceToken);
    expect(overridden.id).toBe(999);
  });

  it("isolates test mutations using container.scope() leaving production container untouched", () => {
    const productionContainer = createProductionContainer();

    // Test A crea su propio scope
    const testScopeA = productionContainer.scope();
    const mockEmailA = new MockEmailSender();
    testScopeA.override(EmailToken).toValue(mockEmailA);

    const orderA = testScopeA.resolve(OrderToken);
    orderA.placeOrder("testA@example.com");
    expect(mockEmailA.sentEmails).toHaveLength(1);

    // Test B crea otro scope independiente
    const testScopeB = productionContainer.scope();
    const mockEmailB = new MockEmailSender();
    testScopeB.override(EmailToken).toValue(mockEmailB);

    const orderB = testScopeB.resolve(OrderToken);
    orderB.placeOrder("testB@example.com");
    expect(mockEmailB.sentEmails).toHaveLength(1);
    expect(mockEmailA.sentEmails).toHaveLength(1); // El scope A no fue afectado

    // El contenedor de producción original sigue intacto
    const realOrder = productionContainer.resolve(OrderToken);
    expect(realOrder.notifier.emailSender).toBeInstanceOf(RealEmailSender);
  });

  it("shares parent singletons across child scopes while allowing local overrides", () => {
    const DatabaseToken = token<{ connected: boolean }>("Database");
    const UserContextToken = token<{ userId: string }>("UserContext");

    const root = new Container();
    root.bind(DatabaseToken).toValue({ connected: true });

    const requestA = root.scope();
    requestA.bind(UserContextToken).toValue({ userId: "user-1" });

    const requestB = root.scope();
    requestB.bind(UserContextToken).toValue({ userId: "user-2" });

    // Ambos hijos heredan la misma conexión a base de datos del padre
    expect(requestA.resolve(DatabaseToken)).toBe(root.resolve(DatabaseToken));
    expect(requestB.resolve(DatabaseToken)).toBe(root.resolve(DatabaseToken));

    // Pero cada hijo tiene su propio contexto aislado
    expect(requestA.resolve(UserContextToken).userId).toBe("user-1");
    expect(requestB.resolve(UserContextToken).userId).toBe("user-2");

    // El padre no conoce los tokens específicos de las peticiones
    expect(root.has(UserContextToken)).toBe(false);
    expect(requestA.has(UserContextToken)).toBe(true);
  });

  it("throws MissingTokenError when overriding a token that was never bound", () => {
    const container = new Container();
    const UnboundToken = token<string>("Unbound");

    expect(() => container.override(UnboundToken).toValue("mock")).toThrow(
      MissingTokenError,
    );
  });

  it("does not leak a scope-local override into an inherited singleton's cache", () => {
    const container = new Container();
    container.bind(EmailToken).toClass(RealEmailSender).inSingleton();
    container
      .bind(NotifierToken)
      .toClass(NotificationService, [EmailToken])
      .inSingleton();

    const testScope = container.scope();
    const mockEmail = new MockEmailSender();
    testScope.override(EmailToken).toValue(mockEmail);

    const scopedNotifier = testScope.resolve(NotifierToken);
    scopedNotifier.notifyUser("scoped@example.com", "hi");
    expect(mockEmail.sentEmails).toHaveLength(1);

    // El singleton resuelto directamente en el contenedor original sigue
    // usando el EmailSender real, sin importar el override hecho en el scope
    const realNotifier = container.resolve(NotifierToken);
    expect(realNotifier.emailSender).toBeInstanceOf(RealEmailSender);
    realNotifier.notifyUser("prod@example.com", "hi");
    expect((realNotifier.emailSender as RealEmailSender).sentCount).toBe(1);

    // Un scope hermano tampoco ve el override de testScope
    const siblingNotifier = container.scope().resolve(NotifierToken);
    expect(siblingNotifier.emailSender).toBeInstanceOf(RealEmailSender);

    // El scope sigue devolviendo la misma instancia singleton en llamadas repetidas
    expect(testScope.resolve(NotifierToken)).toBe(scopedNotifier);
  });

  it("isolates a singleton whose transient dependency transitively uses an override", () => {
    const container = new Container();
    container.bind(EmailToken).toClass(RealEmailSender).inSingleton();
    container.bind(NotifierToken).toClass(NotificationService, [EmailToken]);
    container
      .bind(OrderToken)
      .toClass(OrderService, [NotifierToken])
      .inSingleton();

    const testScope = container.scope();
    const mockEmail = new MockEmailSender();
    testScope.override(EmailToken).toValue(mockEmail);

    const scopedOrder = testScope.resolve(OrderToken);
    scopedOrder.placeOrder("scoped@example.com");
    expect(mockEmail.sentEmails).toHaveLength(1);

    // El OrderService singleton de producción nunca vio el override, aunque
    // llegó a él transitivamente a través de un NotificationService transient
    const prodOrder = container.resolve(OrderToken);
    expect(prodOrder.notifier.emailSender).toBeInstanceOf(RealEmailSender);
    prodOrder.placeOrder("prod@example.com");
    expect((prodOrder.notifier.emailSender as RealEmailSender).sentCount).toBe(
      1,
    );
  });

  it("propagates overrides and isolation through multiple nested scopes", () => {
    const container = createProductionContainer();
    const grandchild = container.scope().scope();

    const mockEmail = new MockEmailSender();
    grandchild.override(EmailToken).toValue(mockEmail);

    const order = grandchild.resolve(OrderToken);
    order.placeOrder("nested@example.com");
    expect(mockEmail.sentEmails).toHaveLength(1);

    expect(grandchild.has(EmailToken)).toBe(true);
    expect(container.has(EmailToken)).toBe(true);

    const prodOrder = container.resolve(OrderToken);
    expect(prodOrder.notifier.emailSender).toBeInstanceOf(RealEmailSender);
  });
});

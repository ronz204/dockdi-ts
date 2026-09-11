import { Container, token } from "dockdi";
import { describe, expect, it } from "vitest";

interface EmailService {
  send(msg: string): string;
}

class RealEmailService implements EmailService {
  public send(msg: string): string {
    return `sent:${msg}`;
  }
}

class MockEmailService implements EmailService {
  public send(msg: string): string {
    return `mocked:${msg}`;
  }
}

class NotificationService {
  constructor(public readonly email: EmailService) {}
}

describe("Testing Utilities: Overrides and Restoration", () => {
  it("allows overriding registered service and invalidates singleton cache", () => {
    const EmailToken = token<EmailService>("Email");
    const container = new Container();

    container.bind(EmailToken).toClass(RealEmailService, []).inSingletonScope();

    const initial = container.resolve(EmailToken);
    expect(initial).toBeInstanceOf(RealEmailService);
    expect(initial.send("hello")).toBe("sent:hello");

    container
      .override(EmailToken)
      .toClass(MockEmailService, [])
      .inSingletonScope();

    const overridden = container.resolve(EmailToken);
    expect(overridden).toBeInstanceOf(MockEmailService);
    expect(overridden.send("hello")).toBe("mocked:hello");
  });

  it("substitutes nested deep dependencies using mock", () => {
    const EmailToken = token<EmailService>("Email");
    const NotifToken = token<NotificationService>("Notif");

    const container = new Container();
    container.bind(EmailToken).toClass(RealEmailService, []).inSingletonScope();
    container.bind(NotifToken).toClass(NotificationService, [EmailToken]);

    const notifBefore = container.resolve(NotifToken);
    expect(notifBefore.email.send("alert")).toBe("sent:alert");

    container.override(EmailToken).toValue({
      send: (m: string) => `stubbed:${m}`,
    });

    const notifAfter = container.resolve(NotifToken);
    expect(notifAfter.email.send("alert")).toBe("stubbed:alert");
  });

  it("restores original binding when calling restore(token)", () => {
    const EmailToken = token<EmailService>("Email");
    const container = new Container();

    container.bind(EmailToken).toClass(RealEmailService, []).inSingletonScope();
    container.resolve(EmailToken);

    container.override(EmailToken).toClass(MockEmailService, []);
    const overridden = container.resolve(EmailToken);
    expect(overridden).toBeInstanceOf(MockEmailService);

    container.restore(EmailToken);
    const restored = container.resolve(EmailToken);
    expect(restored).toBeInstanceOf(RealEmailService);
  });

  it("restores all overridden bindings when calling restore()", () => {
    const TokenA = token<string>("A");
    const TokenB = token<string>("B");
    const container = new Container();

    container.bind(TokenA).toValue("realA");
    container.bind(TokenB).toValue("realB");

    container.override(TokenA).toValue("mockA");
    container.override(TokenB).toValue("mockB");

    expect(container.resolve(TokenA)).toBe("mockA");
    expect(container.resolve(TokenB)).toBe("mockB");

    container.restore();

    expect(container.resolve(TokenA)).toBe("realA");
    expect(container.resolve(TokenB)).toBe("realB");
  });
});

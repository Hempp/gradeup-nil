import { metadata } from "../metadata";

const asText = JSON.stringify(metadata);

test("root metadata carries no fabricated metrics", () => {
  expect(asText).not.toMatch(/127,?450/);
  expect(asText).not.toMatch(/847/);
});

test("root metadata endorses StatStaq while GradeUp stays the product", () => {
  expect(asText).toMatch(/StatStaq/);
  expect(metadata.openGraph?.siteName).toBe("GradeUp NIL");
});

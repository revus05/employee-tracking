export function getRoleLabel(role: "MANAGER" | "DEVELOPER"): string {
  return role === "MANAGER" ? "Руководитель" : "Разработчик";
}

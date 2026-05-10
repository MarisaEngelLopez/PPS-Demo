export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export function duplicateError(itemName = "Item"): ActionResult {
  return {
    ok: false,
    message: `${itemName} not added: already exists in database.`,
  };
}

export function deleteBlockedError(itemName = "Item"): ActionResult {
  return {
    ok: false,
    message: `${itemName} not deleted: it has been used elsewhere.`,
  };
}

export function updateDuplicateError(itemName = "Item"): ActionResult {
  return {
    ok: false,
    message: `${itemName} not updated: another record already exists.`,
  };
}

export function requiredFieldError(fieldName = "Required field"): ActionResult {
  return {
    ok: false,
    message: `Not saved: ${fieldName} is required.`,
  };
}

export function invalidDateError(): ActionResult {
  return {
    ok: false,
    message: "Not saved: planned end date cannot be before planned start date.",
  };
}

export function protectedDeleteError(itemName = "Item"): ActionResult {
  return {
    ok: false,
    message: `${itemName} not deleted: this is protected master data.`,
  };
}

export function notFoundError(itemName = "Item"): ActionResult {
  return {
    ok: false,
    message: `${itemName} not updated: it no longer exists.`,
  };
}

export function databaseError(): ActionResult {
  return {
    ok: false,
    message: "Action not completed: database error.",
  };
}

export function unexpectedError(): ActionResult {
  return {
    ok: false,
    message: "Action not completed: unexpected error.",
  };
}
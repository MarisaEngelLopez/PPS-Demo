import type { Prisma } from "@prisma/client";
import {
  BUSINESS_CODE_FORMATS,
  type BusinessCodeEntity,
  formatBusinessCode,
} from "./codeFormats";

type CodeRow = {
  code: string | null;
};

export async function generateNextBusinessCode(
  tx: Prisma.TransactionClient,
  entityType: BusinessCodeEntity
) {
  const format = BUSINESS_CODE_FORMATS[entityType];
  const prefixPattern = `${format.prefix}_[0-9]*`;
  const codePattern = new RegExp(
    `^${format.prefix}_(\\d{${format.width},})$`
  );

  const rows = await tx.$queryRawUnsafe<CodeRow[]>(
    `SELECT "${format.field}" AS code FROM "${format.table}" WHERE "${format.field}" GLOB ?`,
    prefixPattern
  );

  const maxSequence = rows.reduce((max, row) => {
    const match = row.code?.match(codePattern);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return formatBusinessCode(entityType, maxSequence + 1);
}

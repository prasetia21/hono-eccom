import { and, eq } from "drizzle-orm";
import { db } from "@/libs/postgresql";
import { settingTable } from "@/db/schema/setting";

export class SettingRepository {
  async getSetting(type: string, name: string): Promise<string | null> {
    const setting = await db.query.settingTable.findFirst({
      columns: { settingValue: true },
      where: and(eq(settingTable.settingType, type), eq(settingTable.settingName, name)),
    });

    return setting?.settingValue ?? null;
  }
}

export const settingRepository = new SettingRepository();

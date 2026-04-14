import mysql from 'mysql2/promise';

const statements = [
  "ALTER TABLE `materials` ADD `materialType` enum('partitura','atividade') DEFAULT 'atividade' NOT NULL",
  "ALTER TABLE `materials` ADD `creatorVision` enum('vidente','pdv') DEFAULT 'vidente' NOT NULL",
  "ALTER TABLE `materials` ADD `creatorName` varchar(255)",
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.substring(0, 70));
  } catch (e) {
    if (e.message.includes('Duplicate column')) {
      console.log('SKIP (already exists):', sql.substring(0, 70));
    } else {
      console.error('ERR:', e.message);
    }
  }
}
await conn.end();
console.log('Migration complete.');

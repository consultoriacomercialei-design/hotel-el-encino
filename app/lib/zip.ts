/**
 * Escritor de ZIP mínimo, sin dependencias.
 *
 * Se hace a mano a propósito: el proyecto no tiene librería de compresión y
 * agregar `jszip` (o similar) por un solo caso de uso no se justifica. Node ya
 * trae `zlib`, y el formato ZIP es un contenedor simple:
 *   [encabezado local + datos] × N  →  directorio central  →  fin de directorio
 *
 * Lo usa la exportación mensual de facturas y el generador de .xlsx
 * (un archivo de Excel ES un ZIP con XML adentro).
 */

import { deflateRawSync, crc32 } from 'zlib';

export interface ZipEntry {
  name: string;
  data: Buffer | string;
}

/** Fecha/hora en formato DOS, que es lo que guarda el ZIP. */
function dosDateTime(d: Date): { date: number; time: number } {
  return {
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  };
}

export function createZip(entries: ZipEntry[], now: Date = new Date()): Buffer {
  const { date, time } = dosDateTime(now);
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressed = deflateRawSync(raw);
    const sum = crc32(raw);

    // Encabezado local (30 bytes) + nombre
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);   // firma
    local.writeUInt16LE(20, 4);           // versión necesaria
    local.writeUInt16LE(0x0800, 6);       // bandera: nombres en UTF-8
    local.writeUInt16LE(8, 8);            // método: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, compressed);

    // Entrada del directorio central (46 bytes) + nombre
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);              // versión que lo creó
    cd.writeUInt16LE(20, 6);              // versión necesaria
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(sum, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);         // dónde empieza su encabezado local
    central.push(cd, nameBuf);

    offset += 30 + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(central);

  // Fin del directorio central (22 bytes)
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBuf, end]);
}

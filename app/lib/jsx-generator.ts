export interface CartItem {
  name: string;
  type: 'sprite' | 'postit' | 'mark';
  b64: string;
}

export function generateBatchJsxScript(items: CartItem[]): string {
  const payload = items.map((item) => ({
    name: item.name,
    b64: item.b64,
  }));

  return `function importarLoteCompletoAAltar() {
    if (app.documents.length === 0) {
        alert("¡Error! Debes tener un lienzo de trabajo activo abierto en Photoshop antes de ejecutar el script.");
        return;
    }

    var docActivo = app.activeDocument;
    var assets = ${JSON.stringify(payload, null, 4)};

    function decodeB64(input) {
        var keystr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        while (i < input.length) {
            enc1 = keystr.indexOf(input.charAt(i++));
            enc2 = keystr.indexOf(input.charAt(i++));
            enc3 = keystr.indexOf(input.charAt(i++));
            enc4 = keystr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output += String.fromCharCode(chr1);
            if (enc3 != 64) output += String.fromCharCode(chr2);
            if (enc4 != 64) output += String.fromCharCode(chr3);
        }
        return output;
    }

    for (var i = 0; i < assets.length; i++) {
        var item = assets[i];
        
        var binaryData = decodeB64(item.b64);
        var tempFile = new File(Folder.temp + "/tboi_bulk_asset_" + i + ".png");
        tempFile.encoding = "binary";
        tempFile.open("w");
        tempFile.write(binaryData);
        tempFile.close();

        var docTemporal = app.open(tempFile);
        docTemporal.activeLayer.duplicate(docActivo);
        
        docTemporal.saved = true;
        docTemporal.close();

        docActivo.activeLayer.name = item.name;
        
        tempFile.remove();
    }
}
importarLoteCompletoAAltar();`;
}

export function downloadJsxFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.jsx') ? filename : `${filename}.jsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

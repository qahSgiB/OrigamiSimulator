mipmapy bol problem - pre kresliacu texturu tam nemozu byt

# co som robil
kreslenie = hybem mysou kresli sa na spravne miesto
 - mapovanie 2d brushu s clip spacu na model = podla toho clanku
 - spravne uv koordinaty, predpocitane pre stvorecovu texturu

export
 - png = pixely s gpu, png encoding (browser), save
 - pdf = png, konstrukcia pdf (knzinica), save

kresliace nastruje
 - zopar brushov, nie obrazky ale realny gpu shader (infinite scaling)
 - custom brush
 - nastavania: spacing, size, stamp mode
 - optional depth test (artefakty kvoli presnosti)
 - angle "masking" = kresli iba na steny ktoru maju nejaky uhol voci kamere
 - clear
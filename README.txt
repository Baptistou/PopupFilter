PopupFilter version 1.0 by Baptiste Thémine

Prevents intempestive opening of popups from website scripts.
This add-on is designed with WebExtensions API and is compatible with Firefox, Chrome and Opera.
3 different modes are available :
Normal Mode : Allow the opening of new tabs and new windows (normal behaviour).
Confirm Mode : Ask before opening and displaying content of new tabs/windows.
Blocking Mode : Block all new tabs/windows opened by links or scripts.
PopupFilter contains also a settings webpage which enumerates open/on hold/blocked tabs and permits to do quick actions such as :
close tab, display blocked content of tab, restore blocked tab, go to tab (double click).

Empêche les ouvertures intempestives de popups déclenchées par des scripts web.
Cette extension est développée à l'aide de l'API WebExtensions et est compatible avec les navigateurs Firefox, Chrome et Opera.
3 différents modes sont disponibles :
Normal Mode : Autorise l'ouverture de nouveaux onglets et nouvelles fenêtres (comportement normal).
Confirm Mode : Demande une confirmation avant d'ouvrir et d'afficher le contenu de nouveaux onglets/fenêtres.
Blocking Mode : Bloque tous les nouveaux onglets/fenêtres ouvert(e)s par des liens ou des scripts.
PopupFilter contient également une page de paramètres où sont listés les onglets ouverts, en attente de confirmation ou bloqués, et permet d'effectuer des actions rapides telles que :
fermer un onglet, afficher le contenu bloqué d'un onglet, restaurer un onglet bloqué, aller vers cet onglet (double click).

PopupFilter structure :
C:.
│   manifest.json
│   README.txt
│   script.js
│
├───confirm
│       custom.css
│       index.html
│       script.js
│
├───images
│       icon.ico
│       logo.png
│       space.jpg
│
├───popup
│       custom.css
│       index.html
│       script.js
│
└───settings
        custom.css
        index.html
        script.js

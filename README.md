# Bombada

Bombada is a simple match-3 game written in JavaScript using the Diggy game engine.
Diggy can be found here: http://github.com/lostdecade/diggy
Development on this game is done; it's as far along as it'll ever be.

## More info

http://blog.lostdecadegames.com/diggy-open-source-javascript-game-engine-with

## Known issues

- Doesn't work in IE. My plan from the get-go was to support it, but ... no. Just no.
- When pieces fall they're a little too bouncy when they land. Didn't used to do that. Weird.
- It's too easy. It should have gone through more rounds of testing and tweaking.
- The How-to-play flow is weak sauce. It should be integrated with the gameplay. Out of scope, oh well.
- Pretty sure the `localStorage` stuff doesn't work. Don't even remember at this point :P
- __Note: desired features can be found in htdocs/js/bombada.js comments__

## Platform differences

Platform      | Dimensions | Audio Script   | Sounds Available | Directory Structure

iPad              1024x768   audio_html5.js   Music              Flat
iPhone             420x380   audio_html5.js   Music              Flat
Mobile Safari      420x380   audio_html5.js   Music              Folders
Web                420x380   audio.js         Music/SFX          Folders

## Author

Matt Hackett
richtaur.com

# Bombada

Bombada is a simple match-3 game written in JavaScript using the [Diggy](http://github.com/lostdecade/diggy) game engine. [Read more](http://blog.lostdecadegames.com/diggy-open-source-javascript-game-engine-with)

## Known issues

- Doesn't work in IE. My plan from the get-go was to support it, but ... no. Just no.
- When pieces fall they're a little too bouncy when they land. Didn't used to do that. Weird.
- It's too easy. It should have gone through more rounds of testing and tweaking.
- The How-to-play flow is weak sauce. It should be integrated with the gameplay. Out of scope, oh well.
- _Note: desired features can be found in `htdocs/js/bombada.js` comments_

## Platform differences

`
Platform      | Dimensions | Audio Script   | Sounds Available | Directory Structure

iPad              1024x768   audio_html5.js   Music              Flat
iPhone             420x380   audio_html5.js   Music              Flat
Mobile Safari      420x380   audio_html5.js   Music              Folders
Web                420x380   audio.js         Music/SFX          Folders
`

## Author

Matt Hackett ([richtaur.com](http://richtaur.com/))

Music and sound effects by [Joshua Morse](http://jmflava.com/)

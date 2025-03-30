Need to create file compressing app, that will have this logic:
- Uploading images or videos
- recognizing type of the file to show what ahs been uploaded
- converting it to webm or webp
- use workers to speed up process and maybe compress multiple files in paralel
- when files are ready show how much it reduced weight
- losless compression, so no resolution reduction
- files that have been uploaded will be erased after 10 minutes or when user have downloaded them

UI:
- minimalistic ui that uses shadUI
- dark/light mode
- mobile friendly


Important things:
- use separate express or node server that will work as api and next.js app will be used for UI only
- write tests for ui elements and api

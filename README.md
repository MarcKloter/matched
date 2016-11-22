# Matched

## How it works
The player receives a random word - for example "bean". He then has to use this word to build something new - such as "caribbean".

After a player submits his creation, it will be passed to the [Google Custom Search API](https://developers.google.com/custom-search/) to determine the number of results.
Due to a lack of features in custom searches, like universal search or personalized results, the number will differ from the result of a site search on google.com

The goal is to hit as few results as possible, while scoring more than zero.

The count for "caribbean" is 54'700'000, which is pretty bad. The word "jellybean", scoring 1'690'000, would have been a bit better.

## Planned Features
* Words (preferably only nouns) shall be random and obtained by a word API.
* There should be a list of languages that a user can select from. For each language, there is the option to add a translation (language file(s)) to the applications lang folder. If there is no translation found, the english version will be run through the [Google Cloud Translation API](https://cloud.google.com/translate/) to create a version in the desired language.

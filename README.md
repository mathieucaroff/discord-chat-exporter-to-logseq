# discordJsonToLogseq

This is a simple script that converts a Discord JSON export to a Logseq-friendly format.

## Usage

First, export the data from the channel you want to convert. Use the "JSON" export format in the form that appears after clicking the "Download" icon.

You'll then need to edit the script "convert.ts" to use your own constant values. The variables which need editing are: "JSON_FILE_NAME", "OUTPUT_FOLDER_NAME", "FOLDER_NAME_BEFORE" and "FOLDER_NAME_AFTER".

You can run the script using [bun](https://bun.sh/)

Example:

```sh
env INPUT_JSON_FILE_NAME="input.json" OUTPUT_FILE_NAME_PREFIX=output FOLDER_NAME_AFTER="../assets" bun run ../discord-chat-exporter-to-logseq/convert.ts
```

See [example/convertMultiplePages.ps1](example/convertMultiplePages.ps1) for another usage example.

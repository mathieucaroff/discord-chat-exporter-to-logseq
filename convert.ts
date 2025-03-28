import * as fs from "fs"
import { groupBy } from "lodash"

interface TimedBlock {
  timestamp: string
  block: string
}

function getMonth(timestamp: string) {
  return timestamp.replace(/-\d+T.*/, "")
}

function getMinuteTime(timestamp: string) {
  return timestamp.replace(/:\d+\.\d+.\d+:\d+$/, "")
}

function getSecondTime(timestamp: string) {
  return timestamp.replace(/\..*/, "").replace("T", " ")
}

const INPUT_JSON_FILE_NAME = process.env.INPUT_JSON_FILE_NAME
const OUTPUT_FOLDER_NAME = "out"
const OUTPUT_FILE_NAME_PREFIX = process.env.OUTPUT_FILE_NAME_PREFIX || ""
const OUTPUT_SPLIT_BY_MONTH = Boolean(process.env.OUTPUT_SPLIT_BY_MONTH)
const FOLDER_NAME_BEFORE = `${INPUT_JSON_FILE_NAME}_Files`
const FOLDER_NAME_AFTER = process.env.FOLDER_NAME_AFTER || "../assets"
// FOLDER_NAME_DURING is used to filter out empty files
const FOLDER_NAME_DURING = process.env.FOLDER_NAME_DURING

if (!INPUT_JSON_FILE_NAME) {
  console.error("INPUT_JSON_FILE_NAME is not set")
  process.exit(1)
}

console.log("INPUT_JSON_FILE_NAME is", INPUT_JSON_FILE_NAME)
console.log("OUTPUT_FOLDER_NAME is", OUTPUT_FOLDER_NAME)
console.log("OUTPUT_FILE_NAME_PREFIX is", OUTPUT_FILE_NAME_PREFIX)
console.log("OUTPUT_SPLIT_BY_MONTH is", OUTPUT_SPLIT_BY_MONTH)
console.log("FOLDER_NAME_BEFORE is", FOLDER_NAME_BEFORE)
console.log("FOLDER_NAME_AFTER is", FOLDER_NAME_AFTER)
console.log("FOLDER_NAME_DURING is", FOLDER_NAME_DURING)

function getLocalUrl(url: string) {
  return url.replace(FOLDER_NAME_BEFORE, FOLDER_NAME_AFTER).replace("\\", "/")
}

let emptyFileCount = 0

function fileIsEmpty(url: string) {
  if (!FOLDER_NAME_DURING) {
    return false // Assume that the file is not empty if it can't be checked
  }
  const fileName = url.replace(FOLDER_NAME_BEFORE, FOLDER_NAME_DURING)
  let stats = {} as any

  try {
    stats = fs.statSync(fileName)
    const isEmpty = stats.size === 0
    if (isEmpty) {
      console.log(++emptyFileCount, "File is empty:", fileName)
    }
    return isEmpty
  } catch (error) {
    console.error(++emptyFileCount, error, fileName, "Missing file?")
    return true
  }
}

// Read the HTML file
const { messages } = JSON.parse(fs.readFileSync(INPUT_JSON_FILE_NAME, "utf-8"))

const richMessageArray: TimedBlock[] = messages.map(
  ({ timestamp, content, attachments, embeds }) => {
    let pieceList = [content]
    attachments.forEach(({ fileName, url }) => {
      if (fileIsEmpty(url)) {
        return
      }
      pieceList.push(`![${fileName}](${getLocalUrl(url)})`)
    })
    embeds.forEach(({ title, description, url, thumbnail, images, footer }) => {
      if (url) {
        title = `[${title}](${url})`
      }
      pieceList.push(`**${title}**`)
      if (description) {
        pieceList.push(description)
      }
      if (thumbnail && !fileIsEmpty(thumbnail.url)) {
        pieceList.push(`![thumbnail](${getLocalUrl(thumbnail.url)})`)
      }
      if (images) {
        images.forEach(({ url }) => {
          if (fileIsEmpty(url)) {
            return
          }
          pieceList.push(`![image](${getLocalUrl(url)})`)
        })
      }
      if (footer && footer.text) {
        let { text, iconUrl } = footer
        if (iconUrl) {
          text += `![icon](${getLocalUrl(iconUrl)})`
        }
        pieceList.push(text)
      }
    })

    return {
      timestamp,
      block: pieceList.join("\n"),
    }
  }
)

// <monthList>/<minuteList>/<messageList>
let blockListListArray: TimedBlock[][][] = Object.values(
  groupBy(richMessageArray, ({ timestamp }) => getMonth(timestamp))
).map((monthMessageList) => {
  return Object.values(
    groupBy(monthMessageList, ({ timestamp }) => getMinuteTime(timestamp))
  )
})

// Create the `out` folder if it does not exist
if (!fs.existsSync(OUTPUT_FOLDER_NAME)) {
  fs.mkdirSync(OUTPUT_FOLDER_NAME)
}

if (!OUTPUT_SPLIT_BY_MONTH) {
  blockListListArray = [Array.prototype.concat(...blockListListArray)]
}

blockListListArray.forEach((blockListList) => {
  let yearMonth = getMonth(blockListList[0][0].timestamp)
  if (!OUTPUT_SPLIT_BY_MONTH) {
    yearMonth = ""
  }
  let fileName = `${OUTPUT_FOLDER_NAME}/${OUTPUT_FILE_NAME_PREFIX}${yearMonth}.md`

  // Write the Markdown file
  console.log("Writing", fileName)
  let out: string[] = []
  blockListList.forEach((blockList) => {
    out.push(`- ${getSecondTime(blockList[0].timestamp)}`)
    blockList.forEach(({ block }) => {
      let indentedBlock = block.replace(/\n/g, "\n    ")
      out.push(`  - ${indentedBlock}`)
    })
  })

  fs.writeFileSync(fileName, [...out, ""].join("\n"))
})

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

const JSON_FILE_NAME = "DiscordOxydeDM-2025-03-25.json"
const OUTPUT_FOLDER_NAME = "out"
const FOLDER_NAME_BEFORE = "DiscordOxydeDM-2025-03-25.json_Files"
const FOLDER_NAME_AFTER = "../../assets/OXDMIMG"
// FOLDER_NAME_DURING is used to filter out empty files
const FOLDER_NAME_DURING = process.env.FOLDER_NAME_DURING || ""

console.log("JSON_FILE_NAME is", JSON_FILE_NAME)
console.log("OUTPUT_FOLDER_NAME is", OUTPUT_FOLDER_NAME)
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
const { messages } = JSON.parse(fs.readFileSync(JSON_FILE_NAME, "utf-8"))

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
const blockListListArray: TimedBlock[][][] = Object.values(
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

blockListListArray.forEach((blockListList) => {
  let yearMonth = getMonth(blockListList[0][0].timestamp)
  let fileName = `${OUTPUT_FOLDER_NAME}/OXDM${yearMonth}.md`

  // Write the Markdown file
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

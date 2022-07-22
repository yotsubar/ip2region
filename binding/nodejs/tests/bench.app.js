/*
 * Created by Wu Jian Ping on - 2022/07/22.
 */

const Searcher = require('..')
const { ArgumentParser } = require('argparse')
const readline = require('linebyline')

// 处理输入参数
const parser = new ArgumentParser({
  add_help: true,
  description: 'ip2region benchmark app',
  prog: 'node test.app.js',
  usage: 'Usage %(prog)s [command options]'
})

parser.add_argument('--db', { help: 'ip2region binary xdb file path, default: ../../data/ip2region.xdb' })
parser.add_argument('--src', { help: 'source ip text file path, default: ../../data/ip.merge.txt' })
parser.add_argument('--cache-policy', { help: 'cache policy: file/vectorIndex/content, default: content' })

const args = parser.parse_args()
const dbPath = args.db || '../../data/ip2region.xdb'
const src = args.src || '../../data/ip.merge.txt'
const cachePolicy = args.cache_policy || 'content'

// 创建searcher对象
const createSearcher = () => {
  let searcher = null
  let vectorIndex = null
  let buffer = null

  switch (cachePolicy) {
    case 'file':
      searcher = Searcher.newWithFileOnly(dbPath)
      break
    case 'vectorIndex':
      vectorIndex = Searcher.loadVectorIndexFromFile(dbPath)
      searcher = Searcher.newWithVectorIndex(dbPath, vectorIndex)
      break
    default:
      buffer = Searcher.loadContentFromFile(dbPath)
      searcher = Searcher.newWithBuffer(buffer)
  }
  console.log('options: ')
  console.log(`    dbPath: ${dbPath}`)
  console.log(`    src: ${dbPath}`)
  console.log(`    cache-policy: ${cachePolicy}`)
  console.log('')
  return searcher
}

const ipToInt = ip => {
  // 切割IP
  const ps = ip.split('.')
  // 将各段转成int
  const i0 = parseInt(ps[0])
  const i1 = parseInt(ps[1])
  const i2 = parseInt(ps[2])
  const i3 = parseInt(ps[3])

  // 假如使用移位操作的话，这边可能产生负数
  return i0 * 256 * 256 * 256 + i1 * 256 * 256 + i2 * 256 + i3
}

const intToIp = ip => {
  const i0 = Math.floor(ip / (256 * 256 * 256))
  const i1 = Math.floor((ip % (256 * 256 * 256)) / (256 * 256))
  const i2 = Math.floor((ip % (256 * 256)) / 256)
  const i3 = ip % 256

  return `${i0}.${i1}.${i2}.${i3}`
}

const searcher = createSearcher()

// 开始时间

const startTime = process.hrtime()
let total = 0

// 程序主入口
const main = async () => {
  const rl = readline(src)
  rl
    .on('line', async (line, lineCount, byteCount) => {
      const list = line.split('|')
      const sip = list[0]
      const eip = list[1]
      const sipInt = ipToInt(sip)
      const eipInt = ipToInt(eip)

      const mipInt = Math.floor((sipInt + eipInt) / 2)
      const mip = intToIp(mipInt)

      await searcher.search(mip)
      total++
    })
    .on('error', err => {
      console.log(err)
      process.exit(1)
    })
}

process.on('exit', code => {
  if (code === 0) {
    // 这边只算个总时间就够了
    const diff = process.hrtime(startTime)
    const took = (diff[0] * 1e9 + diff[1]) / 1e9
    console.log(`Bench finished, {cachePolicy: ${cachePolicy}, total: ${total}, took: ${took}s, cost: ${total === 0 ? 0 : ((diff[0] * 1e9 + diff[1]) / 1e6) / total}μs/op}`)
  }
})

main()

export const books = [
  {
    id: 'sea', title: '海底两万里', author: '儒勒·凡尔纳', progress: 0,
    chapters: [
      { id: 'sea-1', number: 1, title: '鹦鹉螺号', duration: '24:12' },
      { id: 'sea-2', number: 2, title: '海上漫游', duration: '25:36' }
    ]
  },
  {
    id: 'cloud-shop', title: '云边有个小卖部', author: '张嘉佳', progress: 46,
    chapters: [
      { id: 'cloud-18', number: 18, title: '山中岁月长', duration: '28:40' },
      { id: 'cloud-19', number: 19, title: '风从云边来', duration: '29:08' }
    ]
  },
  {
    id: 'moon', title: '月亮与六便士', author: '毛姆', progress: 3,
    chapters: [
      { id: 'moon-1', number: 1, title: '伦敦的画家', duration: '22:40' },
      { id: 'moon-2', number: 2, title: '离开文明', duration: '23:10' }
    ]
  },
  {
    id: 'lychee', title: '长安的荔枝', author: '马伯庸', progress: 62,
    chapters: [
      { id: 'lychee-1', number: 1, title: '荔枝使者', duration: '26:18' },
      { id: 'lychee-2', number: 2, title: '长安路远', duration: '27:04' }
    ]
  }
]

export const initialPlayback = { bookId: 'cloud-shop', chapterId: 'cloud-18', positionMs: 756000, status: 'PAUSED' }

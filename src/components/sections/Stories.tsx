import milanIcon from '../../assets/icons/Milan_Icon_Sky.svg'
import badge from '../../assets/badge.svg'
import pizza from '../../assets/pizza.png'
import PhoneMock from '../PhoneMock'
import Post from '../Post'
import type { PostData } from '../Post'

const POSTS: PostData[] = [
  {
    avatar: milanIcon,
    username: 'daysofmilan',
    location: 'Milano',
    images: [pizza, 'https://picsum.photos/id/292/900/1100', 'https://picsum.photos/id/312/900/1100'],
    likes: '1,204',
    captionUser: 'daysofmilan',
    caption:
      'Food lovers, this one’s for you: 10 spots to add to your list for this September in Milan 💗',
  },
  {
    avatar: milanIcon,
    username: 'daysofmilan',
    location: 'Navigli, Milano',
    images: [
      'https://picsum.photos/id/1050/900/1100',
      'https://picsum.photos/id/1060/900/1100',
    ],
    likes: '892',
    captionUser: 'daysofmilan',
    caption: 'Aperitivo hour hits different on the canal 🥂',
  },
  {
    avatar: milanIcon,
    username: 'daysofmilan',
    location: 'Brera, Milano',
    images: ['https://picsum.photos/id/1043/900/1100'],
    likes: '1,530',
    captionUser: 'daysofmilan',
    caption: 'Getting lost in Brera backstreets, one courtyard at a time 🌿',
  },
]

export default function Stories() {
  return (
    <section
      id="stories"
      className="relative flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-sky to-ivory px-6 py-24 text-center"
    >
      <div className="relative z-10 mb-16 flex w-full max-w-2xl flex-col items-center gap-6">
        <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-merlot">
          Stories
        </p>
        <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
          Everything you need to know
        </h2>
        <p className="max-w-2xl font-helvetica text-lg leading-relaxed text-night/80">
          Restaurants, bar, activities and so much more... Everything we love
          about Milan in one place.
        </p>
      </div>

      <PhoneMock>
        {POSTS.map((post, i) => (
          <Post key={i} post={post} />
        ))}
      </PhoneMock>
      
      <img
        src={badge}
        alt=""
        aria-hidden="true"
        className="absolute left-2 top-75 md:left-[15%] lg:left-[30%] md:top-100 w-24 -rotate-12 sm:block sm:w-32"
      />
    </section>
  )
}

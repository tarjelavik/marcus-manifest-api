import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Marcus IIIF Manifest API - demo</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Marcus IIIF Manifest API - demo
        </h1>

        <p className={styles.description}>
          Test it out here!
          <br />
          <Link href="/api/iiif/manifest/ubb-ms-0003"><a>api/iiif/manifest/ubb-ms-0003</a></Link>
          <br />
          <Link href="/api/iiif/manifest/ubb-ms-0185-j-a-007"><a>api/iiif/manifest/ubb-ms-0185-j-a-007</a></Link>
        </p>
        <p>Not working for single page objects.</p>
      </main>
    </div>
  )
}

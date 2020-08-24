import Transaction from '../models/Transaction';
import Category from '../models/Category';
import {getCustomRepository, getRepository, In} from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import TransactionsRepository from '../repositories/TransactionsRepository';


interface CSVTransaction{
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}


class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {

   const transactionRepository = getCustomRepository(TransactionsRepository) ;
   const categoriesRepository = getRepository(Category);

    const constactReadStream = fs.createReadStream(filePath);
    const parses = csvParse({from_line: 2});

    const parseCSV = constactReadStream.pipe(parses);

    const transactions:CSVTransaction[] = [];
    const categories:string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell:string) =>
         cell.trim()
       )


      if(!title || !type || !value) return;

      categories.push(category);
      transactions.push({title, type, value, category});


    });
    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategorie = await categoriesRepository.find({
       where:{
         title:In(categories)
       }
    });

 const existenCategoriesTitles = existentCategorie.map(
   (category: Category) => category.title
 )

 const addCategoryTitle = categories
 .filter(category => !existenCategoriesTitles.includes(category))
 .filter((value,index,self) => self.indexOf(value) === index)


const newCategories = categoriesRepository.create(
   addCategoryTitle.map(title => ({
     title
   }))
)

  console.log(addCategoryTitle);

  await categoriesRepository.save(newCategories);
  const finalCategories = [...newCategories, ...existentCategorie];


  const createadTransactions = transactionRepository.create(
       transactions.map(transaction => ({
           title: transaction.title,
           type: transaction.type,
           value: transaction.value,
           category: finalCategories.find(
               category => category.title === transaction.category
           ),
       }))
  )


  await transactionRepository.save(createadTransactions)

   return createadTransactions;

  }
}

export default ImportTransactionsService;
